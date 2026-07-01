CREATE TABLE IF NOT EXISTS favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (telegram_user_id, product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX idx_favorites_user ON favorites (telegram_user_id);
CREATE INDEX idx_favorites_product ON favorites (product_id);
