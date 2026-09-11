export class ConfigurationError extends Error {
  constructor(public code: string) { super(code); this.name = 'ConfigurationError'; }
}
export function authConfig() {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32 || secret.startsWith('replace-')) throw new ConfigurationError('AUTH_SECRET_INVALID');
  const vercelHost = process.env.VERCEL === '1'
    ? (process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL : process.env.VERCEL_URL)
    : undefined;
  const configured = process.env.APP_ORIGIN?.trim() || (vercelHost ? `https://${vercelHost}` : undefined);
  if (!configured && process.env.VERCEL === '1') throw new ConfigurationError('APP_ORIGIN_MISSING');
  let origin: URL;
  try { origin = new URL(configured || 'http://localhost:4173'); }
  catch { throw new ConfigurationError('APP_ORIGIN_INVALID'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new ConfigurationError('APP_ORIGIN_INVALID');
  if (process.env.VERCEL === '1' && local) throw new ConfigurationError('APP_ORIGIN_LOCAL_ON_VERCEL');
  if (!local && origin.protocol !== 'https:') throw new ConfigurationError('APP_ORIGIN_HTTPS_REQUIRED');
  return {secret, origin: origin.origin, secure: origin.protocol === 'https:'};
}
