/*
# Create storage buckets and add photos column to returns

1. Creates two public storage buckets:
   - review-photos: for customer review images
   - return-photos: for return/defect photos

2. Adds storage RLS policies for anon upload/read on both buckets

3. Adds `photos` column (text array) to returns table

4. Updates returns TypeScript row type requires no migration (done in code)
*/

-- Add photos column to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('return-photos', 'return-photos', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for review-photos
DROP POLICY IF EXISTS "anon can upload review photos" ON storage.objects;
CREATE POLICY "anon can upload review photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "public can read review photos" ON storage.objects;
CREATE POLICY "public can read review photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-photos');

-- Storage RLS policies for return-photos
DROP POLICY IF EXISTS "anon can upload return photos" ON storage.objects;
CREATE POLICY "anon can upload return photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'return-photos');

DROP POLICY IF EXISTS "public can read return photos" ON storage.objects;
CREATE POLICY "public can read return photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'return-photos');
