import { NextResponse } from 'next/server';
import { ApiError } from './security';
import { ConfigurationError } from './config';
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {status, headers: {'Cache-Control': 'no-store'}});
}
export async function handle(work: () => Promise<Response>) {
  try {return await work();}
  catch (error) {
    if (error instanceof ApiError) {
      const response = json({message: error.message, retryAfter: error.retryAfter}, error.status);
      if (error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
    // Never log passwords, session tokens, request bodies, or database credentials.
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    const knownCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '28P01', '3D000', '42P01', '42703', '53300', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'];
    console.error('Wordly API request failed:', error instanceof ConfigurationError ? error.code : typeof code === 'string' && knownCodes.includes(code) ? code : 'INTERNAL_ERROR');
    return json({message: 'ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง'}, 503);
  }
}
