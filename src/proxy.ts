import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  const nonce = randomBytes(24).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // Existing progress rings/charts use style attributes; scripts still require a nonce.
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  if (process.env.APP_ORIGIN?.startsWith('https://')) response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}
export const config = {matcher:['/((?!_next/static|_next/image|assets/|favicon.ico).*)']};
