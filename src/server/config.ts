export function authConfig() {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32 || secret.startsWith('replace-')) throw new Error('Set a random AUTH_SECRET of at least 32 characters');
  const origin = new URL(process.env.APP_ORIGIN || 'http://localhost:4173');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('APP_ORIGIN must be an HTTP(S) origin');
  if (!local && origin.protocol !== 'https:') throw new Error('Public authentication requires HTTPS');
  return {secret, origin: origin.origin, secure: origin.protocol === 'https:'};
}
