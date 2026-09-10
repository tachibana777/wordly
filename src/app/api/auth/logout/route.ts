import { cookies } from 'next/headers';
import { SESSION_COOKIE, sessionOptions } from '@/server/auth';
import { db } from '@/server/db';
import { hashToken, readBody } from '@/server/security';
import { handle, json } from '@/server/http';
export async function POST(request: Request) {
  return handle(async () => {
    await readBody(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await db().query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    const response = json({ok: true});
    response.cookies.set(SESSION_COOKIE, '', {...sessionOptions(), maxAge: 0});
    return response;
  });
}
