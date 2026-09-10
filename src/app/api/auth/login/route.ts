import { cookies } from 'next/headers';
import { login, SESSION_COOKIE, sessionOptions } from '@/server/auth';
import { clientKey, readBody } from '@/server/security';
import { handle, json } from '@/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readBody(request);
    const previous = (await cookies()).get(SESSION_COOKIE)?.value;
    const {user,token} = await login(body.email, body.password, clientKey(request), previous);
    const response = json({user});
    response.cookies.set(SESSION_COOKIE,token,sessionOptions());
    return response;
  });
}
