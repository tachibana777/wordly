'use client';
export default function ErrorPage({reset}: {reset: () => void}) {
  return <main className="auth-shell"><section className="auth-card"><h1>เชื่อมต่อไม่สำเร็จ</h1><p>ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง</p><button className="primary" onClick={reset}>ลองใหม่</button></section></main>;
}
