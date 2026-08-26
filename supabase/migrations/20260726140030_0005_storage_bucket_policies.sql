/*
# CareerConnect AI — Storage Bucket Policies

1. Purpose
   Configures the public `careerconnect` storage bucket for file uploads (resumes, profile photos,
   company logos) with role-based access policies.

2. Storage Policies
   - SELECT (read): public — anyone can read uploaded files (logos, photos, resumes are shared for review).
   - INSERT: authenticated users can upload to their own folder path (`user_id/...`).
   - UPDATE/DELETE: owner of the folder can modify/delete their files.
*/

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('careerconnect', 'careerconnect', true)
ON CONFLICT (id) DO NOTHING;

-- Read: public
DROP POLICY IF EXISTS "cc_storage_read_public" ON storage.objects;
CREATE POLICY "cc_storage_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'careerconnect');

-- Insert: authenticated, files scoped to own folder
DROP POLICY IF EXISTS "cc_storage_insert_own" ON storage.objects;
CREATE POLICY "cc_storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'careerconnect'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: owner folder
DROP POLICY IF EXISTS "cc_storage_update_own" ON storage.objects;
CREATE POLICY "cc_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'careerconnect'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'careerconnect'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: owner folder
DROP POLICY IF EXISTS "cc_storage_delete_own" ON storage.objects;
CREATE POLICY "cc_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'careerconnect'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
