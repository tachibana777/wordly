import { createHash, createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { PoolClient } from 'pg';
import { authConfig } from './config';
export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {super(message);}
}
export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string' || value.length > 320) throw new ApiError(400, 'กรอกอีเมลให้ถูกต้อง');
  const email = value.trim().toLowerCase();
  const parts = email.split('@');
  const [local, domain] = parts;
  if (email.length > 254 || parts.length !== 2 || !local || local.length > 64 || !/^[a-z0-9.!#$%&'*+\-/=?^_`{|}~]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !domain || !domain.includes('.') || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new ApiError(400, 'กรอกอีเมลให้ถูกต้อง เช่น name@example.com');
  }
  return email;
}
export function allowedOrigin(value: string | null) {
  const configured = new URL(authConfig().origin);
  if (value === configured.origin) return true;
  try {
    if (!value) return false;
    const candidate = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'];
    return loopback.includes(configured.hostname) && loopback.includes(candidate.hostname) && candidate.origin === value && candidate.protocol === configured.protocol && candidate.port === configured.port;
  } catch {return false;}
}
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const secretHash = (value: string) => createHmac('sha256', authConfig().secret).update(value).digest('hex');
export function clientKey(request: Request) {
  const header = process.env.TRUSTED_IP_HEADER;
  const ip = header ? request.headers.get(header)?.trim() : undefined;
  return secretHash(ip && isIP(ip) ? ip : 'shared-direct-clients');
}
export async function limit(client: PoolClient, key: string, maximum: number, seconds: number) {
  const {rows} = await client.query<{count: number; retry: number}>(`
    INSERT INTO auth_rate_limits(key, count, expires_at) VALUES ($1, 1, now() + $2 * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_rate_limits.expires_at <= now() THEN 1 ELSE auth_rate_limits.count + 1 END,
      expires_at = CASE WHEN auth_rate_limits.expires_at <= now() THEN now() + $2 * interval '1 second' ELSE auth_rate_limits.expires_at END
    RETURNING count, greatest(1, ceil(extract(epoch FROM expires_at - now())))::int AS retry`, [key, seconds]);
  if (rows[0].count > maximum) throw new ApiError(429, 'ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่', rows[0].retry);
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!allowedOrigin(request.headers.get('origin')) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'ไม่อนุญาตคำขอจากเว็บไซต์นี้');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ApiError(415, 'Expected JSON');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'ข้อมูลไม่ถูกต้อง');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {await reader.cancel(); throw new ApiError(413, 'ข้อความยาวเกินไป');}
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {throw new ApiError(400, 'ข้อมูลไม่ถูกต้อง');}
}
