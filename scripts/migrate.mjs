import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env first');
const client = new pg.Client({connectionString: process.env.DATABASE_URL});
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('wordly-migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../db/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
    if ((await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])).rowCount) continue;
    await client.query(await readFile(new URL(name, directory), 'utf8'));
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
    console.log('Applied migration:', name);
  }
  await client.query('COMMIT');
  console.log('Wordly database schema is ready.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
