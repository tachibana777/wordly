'use client';
import { useRef, useState, type FormEvent } from 'react';
import { post, RequestError } from '@/lib/api';
export function Feedback() {
  const [type, setType] = useState('suggestion'); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(''); const [expired, setExpired] = useState(false); const inFlight = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    if (!message.trim()) {setStatus('กรุณาเขียนความคิดเห็นก่อนส่ง'); return;}
    inFlight.current = true; setBusy(true); setStatus('');
    try {const result = await post<{message: string}>('/api/feedback', {type, name, message}); setStatus(result.message); setMessage(''); setName(''); setType('suggestion');}
    catch (error) {setStatus(error instanceof Error ? error.message : 'ส่งไม่สำเร็จ ข้อความของคุณยังอยู่ในช่องเดิม'); setExpired(error instanceof RequestError && error.status === 401);}
    finally {inFlight.current = false; setBusy(false);}
  }
  return <section id="feedback-page"><div className="hero"><div><div className="greeting">ช่วยให้ Wordly ดีขึ้นไปด้วยกัน</div><h1>ความคิดเห็นของคุณ<span className="accent">.</span></h1><p>อยากให้เพิ่มอะไร พบปัญหาตรงไหน หรือมีคำแนะนำ บอกเราได้เลย</p></div></div><form className="feedback-form sentence-card" onSubmit={submit}><label htmlFor="feedback-type">เรื่องที่อยากบอก</label><select id="feedback-type" value={type} onChange={event => setType(event.target.value)} disabled={busy}><option value="suggestion">แนะนำฟีเจอร์เพิ่มเติม</option><option value="bug">แจ้งปัญหาการใช้งาน</option><option value="content">แนะนำ / แก้ไขเนื้อหาบทเรียน</option><option value="other">ความคิดเห็นอื่น ๆ</option></select><label htmlFor="feedback-name">ชื่อหรือชื่อเล่น <span>(ไม่จำเป็น)</span></label><input id="feedback-name" maxLength={80} autoComplete="nickname" placeholder="ให้เราเรียกคุณว่าอะไร" value={name} onChange={event => setName(event.target.value)} disabled={busy}/><label htmlFor="feedback-message">ความคิดเห็น / ข้อเสนอแนะ <span>(จำเป็น)</span></label><textarea id="feedback-message" rows={6} required maxLength={2000} aria-describedby="feedback-help feedback-count" placeholder="เล่าคำแนะนำหรือปัญหาที่พบได้ที่นี่…" value={message} onChange={event => setMessage(event.target.value)} disabled={busy}/><div className="feedback-meta"><span id="feedback-help">ข้อความจะส่งถึงผู้ดูแลเว็บ ไม่แสดงต่อสาธารณะ</span><span id="feedback-count">{message.length.toLocaleString()} / 2,000</span></div><div className="sentence-actions"><button type="submit" className="sentence-primary" disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งความคิดเห็น'}</button></div><p className="feedback-status" role="status">{status}</p>{expired && <a href="/login" target="_blank" rel="noopener noreferrer">เข้าสู่ระบบในแท็บใหม่ แล้วกลับมาส่งข้อความนี้</a>}</form></section>;
}
