import { requireUser } from './auth';
import { db } from './db';
import { ApiError } from './security';
export async function isAdmin(id: string) {
  return (await db().query('SELECT is_admin FROM users WHERE id=$1', [id])).rows[0]?.is_admin === true;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!await isAdmin(user.id)) throw new ApiError(403, 'เฉพาะผู้ดูแลระบบ');
  return user;
}
