/*
  # Create bot_users table for Telegram bot broadcast

  1. New Tables
    - `bot_users`
      - `id` (uuid, primary key)
      - `chat_id` (bigint, unique) — Telegram chat ID
      - `first_name` (text) — имя пользователя в Telegram
      - `username` (text, nullable) — @username
      - `is_blocked` (boolean, default false) — заблокировал ли пользователь бота
      - `created_at` (timestamptz) — дата первого взаимодействия
      - `updated_at` (timestamptz) — дата последнего обновления

  2. Security
    - Enable RLS on `bot_users` table
    - Allow service_role full access (bot uses service_role key)
    - No anon/authenticated access needed (bot operates server-side)

  3. Notes
    - chat_id is unique to prevent duplicates
    - is_blocked flag used to skip users during broadcast
    - Index on chat_id for fast lookups
    - Index on is_blocked for efficient broadcast queries
*/

CREATE TABLE IF NOT EXISTS bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT '',
  username text,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for broadcast queries (all non-blocked users)
CREATE INDEX IF NOT EXISTS idx_bot_users_active ON bot_users (is_blocked) WHERE is_blocked = false;

ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Only service_role (used by bot server-side) can access this table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to bot_users' AND tablename = 'bot_users') THEN
    CREATE POLICY "Service role full access to bot_users"
      ON bot_users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;