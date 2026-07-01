/*
  # Create audit_log table for admin action tracking

  1. New Tables
    - `audit_log`
      - `id` (uuid, primary key)
      - `admin_id` (text) — admin email or identifier
      - `action` (text) — what was done (create, update, delete, restore, broadcast)
      - `entity_type` (text) — table affected (product, order, user, banner, etc.)
      - `entity_id` (text, nullable) — ID of the affected record
      - `details` (jsonb, nullable) — context (old/new values, metadata)
      - `ip_address` (text, nullable) — request origin
      - `created_at` (timestamptz) — when

  2. Security
    - RLS enabled
    - Service role has full access (edge functions, bot)
    - No anon access

  3. Notes
    - Immutable log — no UPDATE or DELETE allowed
    - JSONB details for flexible schema-less data
    - Indexes on admin_id, entity, created_at, action
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role full access (bot and edge functions use this)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to audit_log' AND tablename = 'audit_log') THEN
    CREATE POLICY "Service role full access to audit_log"
      ON audit_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;