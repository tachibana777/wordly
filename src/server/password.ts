import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ApiError } from './security';
const COST = 131072;
const PREFIX = '$scrypt$131072$8$1$';
const DUMMY = PREFIX + '0'.repeat(32) + '$' + '0'.repeat(128);
const state = globalThis as typeof globalThis & {wordlyHashJobs?: number};
export function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > 256 || [...value].length < 15 || [...value].length > 128 || !value.trim()) throw new ApiError(400, 'ใช้รหัสผ่าน 15–128 ตัวอักษร เช่น วลีหลายคำที่จำได้ง่าย');
}
function derive(password: string, salt: Buffer): Promise<Buffer> {
  // Bound memory use even when many requests arrive at once (128 MiB per job).
  if ((state.wordlyHashJobs || 0) >= 2) throw new ApiError(503, 'ระบบกำลังรับคำขอจำนวนมาก กรุณาลองใหม่', 2);
  state.wordlyHashJobs = (state.wordlyHashJobs || 0) + 1;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, {N:COST, r:8, p:1, maxmem:256 * 1024 * 1024}, (error, key) => {
      state.wordlyHashJobs!--;
      if (error) reject(error); else resolve(key);
    });
  });
}
export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return PREFIX + salt.toString('hex') + '$' + hash.toString('hex');
}
export async function verifyPassword(password: string, stored: string | null) {
  const valid = !!stored && /^\$scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(stored);
  const parts = (valid ? stored : DUMMY).split('$');
  const calculated = await derive(password, Buffer.from(parts[5], 'hex'));
  return timingSafeEqual(calculated, Buffer.from(parts[6], 'hex')) && valid;
}
