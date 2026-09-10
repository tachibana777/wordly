-- Preserve user IDs and feedback when upgrading a database from the old schema.
-- Legacy rows without an email/password cannot authenticate. Never invent credentials.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email IS NULL OR password_hash IS NULL);
ALTER TABLE users DROP COLUMN IF EXISTS phone;
DROP TABLE IF EXISTS otp_challenges;
DELETE FROM auth_rate_limits WHERE key LIKE 'send:%' OR key LIKE 'verify:%';
