import { requireAdmin } from '@/server/admin';
import { db } from '@/server/db';
import { handle, json } from '@/server/http';
import { ApiError, readBody } from '@/server/security';
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const {id,status} = await readBody(request);
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !['new','planned','done'].includes(String(status))) throw new ApiError(400,'ข้อมูลไม่ถูกต้อง');
    const result = await db().query('UPDATE feedback SET status=$2 WHERE id=$1', [id,status]);
    if (!result.rowCount) throw new ApiError(404,'ไม่พบความคิดเห็น');
    return json({ok:true});
  });
}
