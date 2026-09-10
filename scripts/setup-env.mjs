import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  console.log('.env already exists; preserved without changes.');
} else {
  const password = randomBytes(24).toString('hex');
  const secret = randomBytes(32).toString('hex');
  writeFileSync('.env', `POSTGRES_PASSWORD=${password}\nPOSTGRES_PORT=5433\nDATABASE_URL=postgresql://wordly:${password}@127.0.0.1:5433/wordly\nAPP_ORIGIN=http://localhost:4173\nAUTH_SECRET=${secret}\nTRUSTED_IP_HEADER=\n`, {mode: 0o600});
  console.log('Created local .env with random credentials. Email/password authentication is ready after database migration.');
}
