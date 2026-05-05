-- ========== messages.is_partial 标记 ==========
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_partial boolean DEFAULT false;

-- ========== debug_snapshots 表 ==========
CREATE TABLE IF NOT EXISTS debug_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  token text UNIQUE NOT NULL,
  full_output text,
  debug_logs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '24 hours')
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_debug_snapshots_token
  ON debug_snapshots(token);

CREATE INDEX IF NOT EXISTS idx_debug_snapshots_expires_at
  ON debug_snapshots(expires_at);

-- RLS 启用
ALTER TABLE debug_snapshots ENABLE ROW LEVEL SECURITY;

-- owner 可读写
CREATE POLICY "owner_full_access" ON debug_snapshots
  FOR ALL
  USING (user_id = auth.uid());

-- 公开读：通过 token + 未过期
CREATE POLICY "public_read_by_token" ON debug_snapshots
  FOR SELECT
  USING (expires_at > now());