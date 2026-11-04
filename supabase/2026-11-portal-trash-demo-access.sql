-- =====================================================================
-- November 2026 — Let demo (PIN) sign-in use Recently Deleted
-- Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- WHY
--   2026-11-portal-trash.sql only gave access to signed-in Google users ("authenticated").
--   Demo / PIN sign-in talks to the database as "anon", so moving a record to
--   Recently Deleted failed with "new row violates row-level security policy".
--
-- WHAT IT DOES
--   Gives anon the same access to portal_trash that every other portal table has during the
--   demo sign-in phase. In the portal, only Owner/Admin seats see Delete / Restore buttons.
--   When Google sign-in goes live, drop this policy so the stricter rules take over:
--     DROP POLICY "Allow anon all on portal_trash" ON public.portal_trash;
--
-- No data is changed. Safe to run more than once.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'portal_trash' AND policyname = 'Allow anon all on portal_trash'
  ) THEN
    CREATE POLICY "Allow anon all on portal_trash" ON public.portal_trash
      FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_trash TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Read-only check: should list the new anon policy.
SELECT policyname, roles FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'portal_trash';
