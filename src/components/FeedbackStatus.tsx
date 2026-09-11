'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';
export function FeedbackStatus({id,status}: {id:string;status:string}) {
  const [busy,setBusy] = useState(false);
  const [ready,setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [error,setError] = useState('');
  const router = useRouter();
  return <div><select aria-label="สถานะความคิดเห็น" value={status} disabled={busy || !ready} onChange={async event => {
    setBusy(true); setError('');
    try {await post('/api/admin/feedback',{id,status:event.target.value}); router.refresh();}
    catch {setError('บันทึกไม่สำเร็จ กรุณาลองใหม่');}
    finally {setBusy(false);}
  }}><option value="new">ใหม่</option><option value="planned">กำลังดำเนินการ</option><option value="done">เสร็จแล้ว</option></select><span role="alert">{error}</span></div>;
}
