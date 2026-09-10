import { randomUUID } from 'node:crypto';
import { requireUser } from '@/server/auth';
import { transaction } from '@/server/db';
import { ApiError, limit, readBody } from '@/server/security';
import { handle, json } from '@/server/http';
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody(request);
    const user = await requireUser();
    const {message, name, type} = body;
    if (typeof message !== 'string' || !message.trim() || message.length > 2000 || typeof name !== 'string' || name.length > 80 || typeof type !== 'string' || !['suggestion','bug','content','other'].includes(type)) throw new ApiError(400, 'กรอกข้อความและประเภทให้ถูกต้อง');
    await transaction(async client => {
      await limit(client, 'feedback:' + user.id, 10, 3600);
      await client.query('INSERT INTO feedback(id,user_id,type,name,message) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), user.id, type, name.trim(), message.trim()]);
    });
    return json({message: 'ส่งความคิดเห็นเรียบร้อยแล้ว ขอบคุณครับ'}, 201);
  });
}
