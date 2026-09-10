import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { PoolClient } from 'pg';
import type { User } from '../types';
import { db, transaction } from './db';
import { authConfig } from './config';
import { ApiError, hashToken, limit, normalizeEmail, secretHash } from './security';
import { hashPassword, validatePassword, verifyPassword } from './password';
export const SESSION_COOKIE = 'wordly_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export async function authLimit(clientKey: string, action: 'register' | 'login', email: string) {
  await transaction(async client => {
    await limit(client, 'auth:global', 300, 600);
    await limit(client, 'auth:client:' + clientKey, 60, 600);
    await limit(client, `auth:${action}:email:` + secretHash(email), action === 'register' ? 5 : 10, 900);
    if (action === 'register') await limit(client, 'auth:register:client:' + clientKey, 10, 3600);
    await client.query('DELETE FROM auth_rate_limits WHERE expires_at < now()');
    await client.query('DELETE FROM sessions WHERE expires_at < now()');
  });
}
async function issueSession(client: PoolClient, user: User, previousToken?: string) {
  const token = randomBytes(32).toString('base64url');
  if (previousToken) await client.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(previousToken)]);
  await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now() + $3 * interval '1 second')", [hashToken(token), user.id, SESSION_SECONDS]);
  return {user, token};
}
export async function register(rawEmail: unknown, password: unknown, confirmation: unknown, clientKey: string, previousToken?: string) {
  const email = normalizeEmail(rawEmail);
  validatePassword(password);
  if (password !== confirmation) throw new ApiError(400, 'รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  await authLimit(clientKey, 'register', email);
  const encoded = await hashPassword(password);
  return transaction(async client => {
    const {rows} = await client.query<User>(`INSERT INTO users(id,email,password_hash) VALUES ($1,$2,$3)
      ON CONFLICT (email) DO NOTHING RETURNING id,email`, [randomUUID(), email, encoded]);
    if (!rows[0]) throw new ApiError(409, 'สมัครด้วยอีเมลนี้ไม่ได้ กรุณาลองเข้าสู่ระบบหรือใช้อีเมลอื่น');
    return issueSession(client, rows[0], previousToken);
  });
}
export async function login(rawEmail: unknown, password: unknown, clientKey: string, previousToken?: string) {
  const email = normalizeEmail(rawEmail);
  if (typeof password !== 'string' || !password || password.length > 256) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  await authLimit(clientKey, 'login', email);
  const {rows} = await db().query<User & {password_hash: string}>('SELECT id,email,password_hash FROM users WHERE email = $1', [email]);
  const record = rows[0];
  // Unknown accounts do the same expensive password derivation as real accounts.
  const verified = await verifyPassword(password, record?.password_hash ?? null);
  if (!verified || !record) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  return transaction(async client => {
    await client.query('UPDATE users SET last_login_at = now() WHERE id = $1', [record.id]);
    return issueSession(client, {id:record.id, email:record.email}, previousToken);
  });
}
export async function userForToken(token: string | undefined): Promise<User | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await db().query<User>(`SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.email IS NOT NULL AND u.password_hash IS NOT NULL`, [hashToken(token)]);
  return result.rows[0] || null;
}
export async function currentUser() {return userForToken((await cookies()).get(SESSION_COOKIE)?.value);}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ApiError(401, 'กรุณาเข้าสู่ระบบอีกครั้ง');
  return user;
}
export function sessionOptions() {
  return {httpOnly:true, secure:authConfig().secure, sameSite:'lax' as const, path:'/', maxAge:SESSION_SECONDS};
}
