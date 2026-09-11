'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { post, RequestError } from '@/lib/api';
import { Icon } from './Icon';
export function LoginForm() {
  const [mode,setMode] = useState<'login' | 'register'>('login');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [visible,setVisible] = useState(false);
  const [busy,setBusy] = useState(true);
  useEffect(() => setBusy(false), []);
  const [error,setError] = useState('');
  const [retryAt,setRetryAt] = useState(0);
  const [now,setNow] = useState(0);
  const inFlight = useRef(false);
  const registering = mode === 'register';
  const wait = Math.max(0,Math.ceil((retryAt-now)/1000));
  useEffect(() => {const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  function switchMode(next: 'login' | 'register') {setMode(next);setError('');setPassword('');setConfirmation('');setVisible(false);}
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current || wait) return;
    if (registering && ([...password].length < 15 || [...password].length > 128)) {setError('ใช้รหัสผ่าน 15–128 ตัวอักษร เช่น วลีหลายคำที่จำได้ง่าย');return;}
    if (registering && password !== confirmation) {setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');return;}
    inFlight.current=true;setBusy(true);setError('');
    try {
      await post(`/api/auth/${mode}`,{email,password,...(registering?{confirmPassword:confirmation}:{})});
      setPassword('');setConfirmation('');window.location.assign('/');
    } catch (error) {
      setError(error instanceof Error?error.message:'ทำรายการไม่สำเร็จ กรุณาลองใหม่');
      if(error instanceof RequestError && error.retryAfter) {setNow(Date.now());setRetryAt(Date.now()+error.retryAfter*1000);}
    } finally {inFlight.current=false;setBusy(false);}
  }
  return <main className="auth-shell"><section className="auth-story"><a className="brand" href="/login"><span className="brand-mark">w<span>·</span></span><span>wordly<span className="brand-dot">.</span></span></a><span className="eyebrow">YOUR LITTLE ENGLISH SPACE</span><h1>เริ่มต้นเล็ก ๆ<br/>เก่งขึ้นได้ทุกวัน<span className="accent">.</span></h1><p>คำศัพท์ 400 คำ พร้อมแบบฝึกแต่งประโยค<br/>พื้นที่ฝึกภาษาอังกฤษในจังหวะของคุณ</p><div className="auth-illustration" aria-hidden="true"><Icon name="leaf"/><span>Small steps.<br/><em>Big possibilities.</em></span></div></section>
    <section className="auth-card" aria-labelledby="auth-title"><span className="auth-icon"><Icon name="sun"/></span><h2 id="auth-title">{registering?'สร้างบัญชี Wordly':'กลับมาเรียนรู้ด้วยกัน'}</h2><p>{registering?'สมัครด้วยอีเมลและรหัสผ่าน แล้วเริ่มเรียนได้เลย':'เข้าสู่ระบบเพื่อเรียนต่อในพื้นที่ของคุณ'}</p>
      <div className="mode-switch auth-tabs" role="group" aria-label="สมัครสมาชิกหรือเข้าสู่ระบบ"><button aria-pressed={!registering} className={!registering?'active':''} onClick={()=>switchMode('login')} disabled={busy}>เข้าสู่ระบบ</button><button aria-pressed={registering} className={registering?'active':''} onClick={()=>switchMode('register')} disabled={busy}>สมัครสมาชิก</button></div>
      <form method="post" onSubmit={submit}><label htmlFor="email">อีเมล</label><input id="email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} disabled={busy}/>
        <label htmlFor="password">รหัสผ่าน</label><div className="password-field"><input id="password" name="password" type={visible?'text':'password'} autoComplete={registering?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256} disabled={busy} aria-describedby={registering?'password-help':undefined}/><button type="button" className="password-toggle" onClick={()=>setVisible(!visible)} aria-label={visible?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} aria-pressed={visible}><Icon name="eye"/></button></div>
        {registering && <><small id="password-help">15–128 ตัวอักษร ใช้เป็นวลีหลายคำได้ ไม่ต้องบังคับผสมสัญลักษณ์</small><label htmlFor="confirm-password">ยืนยันรหัสผ่าน</label><input id="confirm-password" name="confirmPassword" type={visible?'text':'password'} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required maxLength={256} disabled={busy}/></>}
        {error && <p className="input-error" role="alert">{error}</p>}<button className="primary auth-submit" type="submit" disabled={busy || wait>0}>{busy?'กำลังดำเนินการ…':wait>0?`ลองใหม่ได้ใน ${wait} วินาที`:registering?'สมัครและเริ่มเรียนรู้':'เข้าสู่ระบบและเรียนต่อ'}<Icon name="arrow"/></button>
      </form><p className="auth-caption">{registering?'บันทึกอีเมลและรหัสผ่านไว้ในตัวจัดการรหัสผ่าน เพื่อกลับมาเรียนต่อได้สะดวก':'ระบบจะจำการเข้าสู่ระบบไว้ หากใช้เครื่องร่วมกับคนอื่น อย่าลืมออกจากระบบเมื่อเรียนเสร็จ'}</p><p className="auth-caption">ช่วงทดลองใช้งาน ผู้ดูแลดูผลการฝึกคำศัพท์ ประโยค และความคิดเห็นที่ผูกกับบัญชี เพื่อปรับปรุงบทเรียนได้</p>
    </section></main>;
}
