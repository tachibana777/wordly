import { NextResponse } from 'next/server';
import { ApiError } from './security';
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
    console.error('Wordly API request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({message: 'ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง'}, 503);
  }
}
