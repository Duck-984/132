/*
  # Create broadcast queue system

  1. New Tables
    - `broadcast_jobs`
      - `id` (uuid, primary key)
      - `message` (text) — message content to broadcast
      - `parse_mode` (text, default 'HTML') — Telegram parse mode
      - `status` (text, default 'pending') — pending, processing, completed, failed
      - `total_recipients` (int, default 0) — total users to send to
      - `sent_count` (int, default 0) — successfully sent
      - `failed_count` (int, default 0) — failed deliveries
      - `blocked_count` (int, default 0) — users who blocked the bot
      - `created_by` (text) — admin who initiated
      - `started_at` (timestamptz, nullable) — when processing began
      - `completed_at` (timestamptz, nullable) — when finished
      - `created_at` (timestamptz)

    - `broadcast_failures`
      - `id` (uuid, primary key)
      - `job_id` (uuid, FK to broadcast_jobs)
      - `chat_id` (bigint) — failed recipient
      - `error` (text) — error message
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Service role full access

  3. Notes
    - Queue-based: admin creates a job, worker processes it
    - Failures tracked individually for retry or debugging
    - Status transitions: pending -> processing -> completed/failed
*/

CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  parse_mode text NOT NULL DEFAULT 'HTML',
  status text NOT NULL DEFAULT 'pending',
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  blocked_count int NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT 'admin',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON broadcast_jobs (status);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_created ON broadcast_jobs (created_at DESC);

ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to broadcast_jobs' AND tablename = 'broadcast_jobs') THEN
    CREATE POLICY "Service role full access to broadcast_jobs"
      ON broadcast_jobs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Failures table for detailed error tracking
CREATE TABLE IF NOT EXISTS broadcast_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES broadcast_jobs(id),
  chat_id bigint NOT NULL,
  error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_failures_job ON broadcast_failures (job_id);

ALTER TABLE broadcast_failures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to broadcast_failures' AND tablename = 'broadcast_failures') THEN
    CREATE POLICY "Service role full access to broadcast_failures"
      ON broadcast_failures
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;