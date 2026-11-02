-- =====================================================================
-- November 2026 — Engagement classification
-- Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- WHAT IT DOES
--   Adds three new, EMPTY, optional columns to the engagements table:
--     service_practice   "Service / Practice"       what DataIsData is delivering
--     revenue_model      "Revenue / Pricing Model"  how the engagement generates revenue
--     engagement_status  "Engagement Status"        Identified → Discovery → Proposed →
--                                                   Negotiation → Awarded → Active →
--                                                   On Hold → Completed → Closed
--   The existing engagement_type column is reused as "Engagement Type" (no change to it).
--
-- WHAT IT DOES NOT DO
--   No UPDATE, DELETE, DROP, TRUNCATE, RENAME or type change. Not one existing value is
--   touched: every engagement keeps its name, account, type ("Staff Aug" etc.), status,
--   dates, values, scope and links exactly as imported. New columns start blank (NULL).
--   No CHECK constraints, so nothing can ever be rejected because of these columns.
--   Row-level security and grants already on the table cover the new columns automatically.
--
-- Safe to run more than once (IF NOT EXISTS).
-- =====================================================================

BEGIN;

ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS service_practice  text;
ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS revenue_model     text;
ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS engagement_status text;

COMMENT ON COLUMN public.engagements.engagement_type   IS 'Engagement Type: how DataIsData is engaged by the client (e.g. Staff Augmentation, Advisory, Project-Based).';
COMMENT ON COLUMN public.engagements.service_practice  IS 'Service / Practice: what DataIsData is delivering (e.g. Platform Development, AI & Automation).';
COMMENT ON COLUMN public.engagements.revenue_model     IS 'Revenue / Pricing Model: how the engagement generates revenue (e.g. Fixed Fee, Monthly Retainer).';
COMMENT ON COLUMN public.engagements.engagement_status IS 'Engagement Status (Identified, Discovery, Proposed, Negotiation, Awarded, Active, On Hold, Completed, Closed). Separate from status, which is delivery status.';

COMMIT;

-- Tell the Supabase API about the new columns right away.
NOTIFY pgrst, 'reload schema';

-- Read-only check: your engagement count is unchanged and the new fields start empty.
SELECT
  count(*)                                   AS engagements_total,
  count(*) FILTER (WHERE engagement_type IS NOT NULL)   AS with_engagement_type,
  count(*) FILTER (WHERE service_practice IS NOT NULL)  AS with_service_practice,
  count(*) FILTER (WHERE revenue_model IS NOT NULL)     AS with_revenue_model,
  count(*) FILTER (WHERE engagement_status IS NOT NULL) AS with_engagement_status
FROM public.engagements;
