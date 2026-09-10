CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL CHECK (type IN ('suggestion', 'bug', 'content', 'other')),
  name text NOT NULL DEFAULT '',
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
