import { Pool, type PoolClient } from 'pg';
import { ConfigurationError } from './config';
const globalDb = globalThis as typeof globalThis & { wordlyPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new ConfigurationError('DATABASE_URL_MISSING');
  let url: URL;
  try { url = new URL(process.env.DATABASE_URL); }
  catch { throw new ConfigurationError('DATABASE_URL_INVALID'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new ConfigurationError('DATABASE_URL_INVALID');
  if (process.env.VERCEL === '1' && ['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname)) throw new ConfigurationError('DATABASE_URL_LOCAL_ON_VERCEL');
  return globalDb.wordlyPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
