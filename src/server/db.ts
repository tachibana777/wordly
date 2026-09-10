import { Pool, type PoolClient } from 'pg';
const globalDb = globalThis as typeof globalThis & { wordlyPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  return globalDb.wordlyPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
