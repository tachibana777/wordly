import pg from 'pg';

// Read-only deployment check. Never print connection strings or user records.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL_MISSING');
  process.exit(1);
}
const client = new pg.Client({connectionString, connectionTimeoutMillis:15000, query_timeout:15000});
try {
  await client.connect();
  const {rows} = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('users', 'sessions', 'auth_rate_limits')");
  const required = {users:['id','email','password_hash','last_login_at'], sessions:['token_hash','user_id','expires_at'], auth_rate_limits:['key','count','expires_at']};
  const missing = Object.entries(required).flatMap(([table, columns]) => columns.filter(column => !rows.some(row => row.table_name === table && row.column_name === column)).map(column => `${table}.${column}`));
  if (missing.length) {
    console.error('AUTH_SCHEMA_MISSING:', missing.join(', '));
    process.exitCode = 1;
  } else console.log('Neon/PostgreSQL connection and authentication columns: OK');
} catch (error) {
  const safeCodes = ['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','28P01','3D000','42P01'];
  console.error('DATABASE_CHECK_FAILED:', safeCodes.includes(error.code) ? error.code : 'CONNECTION_OR_QUERY_ERROR');
  process.exitCode = 1;
} finally {
  await client.end();
}
