-- =============================================================================
-- ATTACHMENTS: Add columns + Storage policies for file uploads
-- Run this in Supabase SQL Editor after your main schema is applied.
--
-- Before file uploads will work you must also create a Storage bucket in the
-- Supabase Dashboard: Storage -> New bucket -> Name: crm-attachments, Public: ON
-- =============================================================================

-- 1) Add attachments column to tables that don't have it yet
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS attachments TEXT[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS attachments TEXT[];
ALTER TABLE partners ADD COLUMN IF NOT EXISTS attachments TEXT[];
-- activities already has attachments TEXT[] in schema

-- 2) Storage policies: allow anon to upload/read/update/delete in crm-attachments
-- (Create the bucket "crm-attachments" in Dashboard > Storage first, set to Public)
DROP POLICY IF EXISTS "Allow anon uploads to crm-attachments" ON storage.objects;
CREATE POLICY "Allow anon uploads to crm-attachments"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'crm-attachments');

DROP POLICY IF EXISTS "Allow anon read crm-attachments" ON storage.objects;
CREATE POLICY "Allow anon read crm-attachments"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'crm-attachments');

DROP POLICY IF EXISTS "Allow anon update crm-attachments" ON storage.objects;
CREATE POLICY "Allow anon update crm-attachments"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'crm-attachments');

DROP POLICY IF EXISTS "Allow anon delete crm-attachments" ON storage.objects;
CREATE POLICY "Allow anon delete crm-attachments"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'crm-attachments');
