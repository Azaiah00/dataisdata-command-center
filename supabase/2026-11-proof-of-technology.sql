-- =====================================================================
-- November 2026 — Rename Engagement Type "Pilot / Proof of Concept" → "Proof of Technology"
-- Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- WHAT IT DOES
--   1. Renames the choice in the Engagement Type list. It keeps the same spot in the list.
--   2. Moves any engagement that used the old name over to the new name.
--
-- No data is deleted. Safe to run more than once.
-- =====================================================================

BEGIN;

-- 1) Rename the dropdown choice (skipped if "Proof of Technology" already exists).
UPDATE public.portal_field_options
SET value = 'Proof of Technology', updated_at = now()
WHERE field_key = 'engagement_type'
  AND value = 'Pilot / Proof of Concept'
  AND NOT EXISTS (
    SELECT 1 FROM public.portal_field_options
    WHERE field_key = 'engagement_type' AND lower(value) = 'proof of technology'
  );

-- 2) Carry the new name onto engagements that use the old one.
UPDATE public.engagements
SET engagement_type = 'Proof of Technology'
WHERE engagement_type = 'Pilot / Proof of Concept';

COMMIT;

-- Read-only check: the Engagement Type list, in order.
SELECT value, sort_order FROM public.portal_field_options
WHERE field_key = 'engagement_type'
ORDER BY sort_order;
