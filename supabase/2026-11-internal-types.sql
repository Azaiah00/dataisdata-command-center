-- =====================================================================
-- November 2026 — "Internal" engagement type + "Internal Development" account type
-- Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- WHAT IT DOES
--   1. Adds "Internal" to the Engagement Type dropdown (Admin > Field Options list).
--      Used for DataIsData's own in-house engagements.
--   2. Adds "Internal Development" as an Account Type.
--      Named this way so it is not confused with the "Internal" engagement type.
--      If an older "Internal" account type exists, it is renamed to "Internal Development"
--      (any account already using it moves over automatically).
--
-- No data is deleted. Safe to run more than once.
-- =====================================================================

-- 1) Engagement Type: "Internal" (only added if it is not already in the list).
INSERT INTO public.portal_field_options (field_key, value, description, sort_order)
SELECT 'engagement_type', 'Internal',
       'DataIsData''s own in-house work, such as building internal tools or company initiatives.', 100
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_field_options
  WHERE field_key = 'engagement_type' AND lower(value) = 'internal'
);

-- 2) Account Type: "Internal Development".
-- accounts.account_type is a Postgres enum named account_type, so the new choice is added to it.
-- If the database has no such enum (the column is plain text), nothing is needed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    IF EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'account_type' AND e.enumlabel = 'Internal'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'account_type' AND e.enumlabel = 'Internal Development'
    ) THEN
      -- An older "Internal" choice exists: rename it so existing accounts keep their type.
      ALTER TYPE account_type RENAME VALUE 'Internal' TO 'Internal Development';
    ELSE
      ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'Internal Development';
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Read-only check: both new choices should appear.
SELECT 'engagement_type' AS list, value FROM public.portal_field_options
WHERE field_key = 'engagement_type' AND value = 'Internal'
UNION ALL
SELECT 'account_type', e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'account_type' AND e.enumlabel = 'Internal Development';
