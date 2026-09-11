ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','done'));
CREATE TABLE IF NOT EXISTS learning_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('word','sentence')),
  item_id text NOT NULL,
  category text NOT NULL,
  status text NOT NULL CHECK (status IN ('known','practice')),
  score numeric CHECK (score IN (0,0.5,1)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_user_time ON learning_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS learning_time ON learning_events(created_at DESC);
