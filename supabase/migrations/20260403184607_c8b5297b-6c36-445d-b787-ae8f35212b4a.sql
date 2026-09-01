-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'art-uploads';

-- Drop any existing overly-permissive SELECT policy
DROP POLICY IF EXISTS "Public read access for art-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view art uploads" ON storage.objects;

-- Ensure owner-only policies exist
-- SELECT: only owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can view own art uploads' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owner can view own art uploads"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;

-- INSERT: only owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can upload art files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owner can upload art files"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;

-- UPDATE: only owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can update own art files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owner can update own art files"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;

-- DELETE: only owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can delete own art files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owner can delete own art files"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;