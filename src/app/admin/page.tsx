import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { db } from '@/server/db';
import { categories } from '@/data/vocabulary';
import { FeedbackStatus } from '@/components/FeedbackStatus';
import './style.css';
export const dynamic = 'force-dynamic';
const date = (value: string | Date | null) => value ? new Date(value).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}) : 'ยังไม่มีข้อมูล';
const categoryName = (value:string) => categories.find(c => c.id === value)?.name ?? ({easy:'ประโยค · ง่าย',hard:'ประโยค · ยาก'}[value] || value);
export default async function Admin({searchParams}: {searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!await isAdmin(user.id)) notFound();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0,254) : '';
  const status = ['new','planned','done'].includes(String(params.status)) ? String(params.status) : '';
  const selected = typeof params.user === 'string' && /^[0-9a-f-]{36}$/i.test(params.user) ? params.user : '';
  const page = Math.max(1,Math.min(100000,Number(params.page) || 1)) | 0;
  const offset = (page-1)*25;
  const [summary, users, feedback, breakdown] = await Promise.all([
    db().query(`SELECT (SELECT count(*) FROM users WHERE email IS NOT NULL) AS users,
      (SELECT count(DISTINCT user_id) FROM learning_events WHERE created_at >= now()-interval '7 days') AS active,
      (SELECT count(*) FROM learning_events WHERE created_at >= now()-interval '7 days') AS attempts,
      (SELECT count(*) FROM feedback WHERE status='new') AS pending`),
    db().query(`SELECT u.id,u.email,u.created_at,u.last_login_at,
      (SELECT count(*) FROM learning_events e WHERE e.user_id=u.id) AS attempts,
      (SELECT max(created_at) FROM learning_events e WHERE e.user_id=u.id) AS last_study
      FROM users u WHERE u.email ILIKE $1 ORDER BY u.created_at DESC,u.id LIMIT 26 OFFSET $2`, ['%'+q+'%',offset]),
    db().query(`SELECT f.id,f.type,f.message,f.name,f.status,f.created_at,u.email FROM feedback f JOIN users u ON u.id=f.user_id
      WHERE ($1='' OR f.status=$1) AND u.email ILIKE $2 AND ($3='' OR f.user_id::text=$3)
      ORDER BY f.created_at DESC,f.id LIMIT 26 OFFSET $4`, [status,'%'+q+'%',selected,offset]),
    db().query(`SELECT kind,category,count(*) AS attempts,count(DISTINCT item_id) AS items,
      round(avg(score)*100,1) AS score,max(created_at) AS latest
      FROM learning_events WHERE ($1='' OR user_id::text=$1)
      GROUP BY kind,category ORDER BY count(*) DESC`,[selected]),
  ]);
  const chosen = selected ? (await db().query('SELECT email FROM users WHERE id::text=$1',[selected])).rows[0] : null;
  const href = (next:number) => '/admin?'+new URLSearchParams({q,status,user:selected,page:String(next)});
  const stats=summary.rows[0];
  return <main className="admin-shell"><header><div><p>WORDLY · ADMIN</p><h1>ภาพรวมการทดลองใช้งาน</h1></div><Link href="/">กลับไปเรียน →</Link></header>
    <p>ข้อมูลกิจกรรมเริ่มเก็บหลังติดตั้งระบบนี้ นับการตอบและการประเมินตนเอง ไม่ใช่เวลาที่เปิดเว็บ คะแนนมาจากแอปของผู้เรียน</p>
    <div className="admin-stats">{[['สมาชิกทั้งหมด',stats.users],['ผู้เรียนใน 7 วัน',stats.active],['การฝึกใน 7 วัน',stats.attempts],['Feedback ใหม่',stats.pending]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <form className="admin-filters"><label>ค้นหาอีเมล<input name="q" defaultValue={q} maxLength={254}/></label><label>สถานะ Feedback<select name="status" defaultValue={status}><option value="">ทั้งหมด</option><option value="new">ใหม่</option><option value="planned">กำลังดำเนินการ</option><option value="done">เสร็จแล้ว</option></select></label>{selected && <input type="hidden" name="user" value={selected}/>}<button>ค้นหา</button><Link href="/admin">ล้างตัวกรอง</Link></form>
    <section><h2>ผู้ใช้งาน</h2><div className="admin-table"><table><thead><tr><th>อีเมล</th><th>สมัครเมื่อ</th><th>ล็อกอินล่าสุด</th><th>ฝึกทั้งหมด (ครั้ง)</th><th>เรียนล่าสุด</th></tr></thead><tbody>{users.rows.slice(0,25).map(u => <tr key={u.id}><td><Link href={'/admin?user='+u.id}>{u.email}</Link></td><td>{date(u.created_at)}</td><td>{date(u.last_login_at)}</td><td>{u.attempts}</td><td>{date(u.last_study)}</td></tr>)}</tbody></table></div>{!users.rows.length && <p>ไม่พบผู้ใช้</p>}</section>
    <section><h2>การเรียนแยกหมวด · {chosen?.email || (selected ? 'ไม่พบผู้ใช้' : 'ทุกคน')}</h2><p>คะแนนเฉลี่ยคิดเฉพาะครั้งที่มีคะแนน ส่วนการกดจำได้/ฝึกต่อด้วยตนเองไม่รวมในคะแนน</p><div className="admin-table"><table><thead><tr><th>หมวด</th><th>ครั้งที่ฝึก</th><th>ข้อที่เคยฝึก</th><th>คะแนนเฉลี่ย</th><th>ล่าสุด</th></tr></thead><tbody>{breakdown.rows.map(r => <tr key={r.kind+r.category}><td>{categoryName(r.category)}</td><td>{r.attempts}</td><td>{r.items}</td><td>{r.score === null ? '—' : r.score+'%'}</td><td>{date(r.latest)}</td></tr>)}</tbody></table></div>{!breakdown.rows.length && <p>ยังไม่มีกิจกรรมการเรียนที่บันทึกไว้</p>}</section>
    <section><h2>Feedback {chosen ? '· '+chosen.email : ''}</h2>{feedback.rows.slice(0,25).map(f => <article className="admin-feedback" key={f.id}><div><strong>{f.email}</strong> · {({suggestion:'ข้อเสนอแนะ',bug:'ปัญหาการใช้งาน',content:'เนื้อหา',other:'อื่น ๆ'} as Record<string,string>)[f.type]}<p>{date(f.created_at)}{f.name && ' · '+f.name}</p></div><p className="admin-message">{f.message}</p><FeedbackStatus id={f.id} status={f.status}/></article>)}{!feedback.rows.length && <p>ไม่มี Feedback ตามตัวกรองนี้</p>}</section>
    <nav className="admin-filters" aria-label="เปลี่ยนหน้ารายการ">{page>1 && <Link href={href(page-1)}>← ก่อนหน้า</Link>}<span>หน้าที่ {page} · สูงสุด 25 รายการต่อส่วน</span>{(users.rows.length>25 || feedback.rows.length>25) && <Link href={href(page+1)}>ถัดไป →</Link>}</nav>
  </main>;
}
