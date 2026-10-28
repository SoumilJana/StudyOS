-- Set up private storage bucket for uploaded study documents & notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  false,
  52428800, -- 50 MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage object RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'user_storage_select'
  ) THEN
    CREATE POLICY "user_storage_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = (select auth.uid()::text));

    CREATE POLICY "user_storage_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = (select auth.uid()::text));

    CREATE POLICY "user_storage_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = (select auth.uid()::text))
      WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = (select auth.uid()::text));

    CREATE POLICY "user_storage_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = (select auth.uid()::text));
  END IF;
END $$;
