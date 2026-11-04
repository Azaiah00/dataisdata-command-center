-- =====================================================================
-- November 2026 — Editable field options (Admin > Field Options)
-- Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--
-- WHAT IT DOES
--   Creates ONE new table, portal_field_options, that holds the dropdown choices for the four
--   engagement classification fields (Engagement Type, Service / Practice, Revenue / Pricing
--   Model, Engagement Status), and fills it with the choices the portal uses today.
--   Owner and Admin seats can then add, rename, reorder, hide or remove choices in the portal,
--   and every form, filter, report and the Glossary use the same list.
--
-- WHAT IT DOES NOT DO
--   Does not touch the engagements table or any other existing table. No UPDATE, DELETE,
--   DROP or TRUNCATE on anything that already exists. Tony's data is not read or changed.
--
-- Safe to run more than once: the table is created only if missing, and a choice is only
-- added if that field doesn't already have it (choices you edited are left as they are).
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.portal_field_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key   text NOT NULL CHECK (field_key IN ('engagement_type', 'service_practice', 'revenue_model', 'engagement_status')),
  value       text NOT NULL CHECK (length(btrim(value)) > 0),
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  -- Engagement Status only: the reporting phase this status rolls up to.
  phase       text CHECK (phase IS NULL OR phase IN ('In development', 'Generating revenue', 'On hold', 'Closed out')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

-- One choice per name in each list (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS portal_field_options_field_value_uq
  ON public.portal_field_options (field_key, lower(value));

COMMENT ON TABLE public.portal_field_options IS 'Dropdown choices for the engagement classification fields, managed in Admin > Field Options (Owner/Admin only).';

-- Today's choices. Only inserted when that field doesn't have a choice with the same name.
INSERT INTO public.portal_field_options (field_key, value, description, sort_order, phase)
SELECT v.field_key, v.value, v.description, v.sort_order, v.phase
FROM (VALUES
  -- Engagement Type
  ('engagement_type', 'Staff Augmentation', 'Providing contractors or specialized resources to clients, such as the DMAS engagements.', 10, NULL),
  ('engagement_type', 'Advisory', 'Strategic guidance, executive advisory, fractional CTO/CIO and innovation leadership.', 20, NULL),
  ('engagement_type', 'Consulting', 'Defined professional services: assessments, recommendations, planning or business transformation.', 30, NULL),
  ('engagement_type', 'Project-Based', 'A specific project with defined deliverables, milestones and completion dates.', 40, NULL),
  ('engagement_type', 'Managed Services', 'Ongoing responsibility for managing a client''s technology, innovation programs or operations.', 50, NULL),
  ('engagement_type', 'Strategic Partnership', 'Collaborations with companies, universities, municipalities or other organizations to pursue opportunities.', 60, NULL),
  ('engagement_type', 'Joint Venture', 'Formal arrangements where DataIsData and another organization jointly pursue or deliver work.', 70, NULL),
  ('engagement_type', 'Proof of Technology', 'Limited-scope engagements to test new technologies or demonstrate business value.', 80, NULL),
  ('engagement_type', 'Assessment / Discovery', 'Initial paid engagements to evaluate client needs, identify opportunities or develop a roadmap.', 90, NULL),
  ('engagement_type', 'Internal', 'DataIsData''s own in-house work, such as building internal tools or company initiatives.', 100, NULL),
  -- Service / Practice
  ('service_practice', 'Platform Development', 'Websites, portals, CRM systems, applications and digital platforms.', 10, NULL),
  ('service_practice', 'Innovation as a Service', 'Ongoing innovation programs, pilots, technology discovery and implementation.', 20, NULL),
  ('service_practice', 'AI & Automation', 'AI solutions, workflow automation and intelligent tools.', 30, NULL),
  ('service_practice', 'Municipal Broadband / Smart City', 'Broadband strategy and smart-city technology for municipalities.', 40, NULL),
  ('service_practice', 'Program & Project Management', 'Running programs and projects: schedules, budgets, resources and outcomes.', 50, NULL),
  ('service_practice', 'Technology Strategy', 'Technology roadmaps, assessments and executive guidance.', 60, NULL),
  ('service_practice', 'Workforce Development', 'Training, internships and career pathway programs.', 70, NULL),
  ('service_practice', 'Enterprise Architecture', 'Systems, data and infrastructure architecture.', 80, NULL),
  ('service_practice', 'Professional Resources', 'Contractors and specialized staff placed with the client.', 90, NULL),
  ('service_practice', 'Economic & Innovation Development', 'Economic development and innovation-district initiatives.', 100, NULL),
  ('service_practice', 'Smart Infrastructure', 'Connected infrastructure, sensing and inspection technology.', 110, NULL),
  -- Revenue / Pricing Model
  ('revenue_model', 'Hourly / Time & Materials', 'Billed by the hour for time and materials.', 10, NULL),
  ('revenue_model', 'Fixed Fee', 'One agreed price for the defined scope.', 20, NULL),
  ('revenue_model', 'Monthly Retainer', 'A set fee every month for ongoing access or services.', 30, NULL),
  ('revenue_model', 'Subscription / Licensing', 'Recurring fees for using a DataIsData platform or technology.', 40, NULL),
  ('revenue_model', 'Revenue Share', 'A percentage of the revenue the solution or partnership generates.', 50, NULL),
  ('revenue_model', 'Milestone-Based', 'Paid as defined milestones are delivered.', 60, NULL),
  ('revenue_model', 'Performance-Based', 'Paid on measured results or outcomes.', 70, NULL),
  ('revenue_model', 'Hybrid', 'A combination of the models above.', 80, NULL),
  -- Engagement Status (with reporting phase)
  ('engagement_status', 'Identified', 'Opportunity spotted; not yet engaged.', 10, 'In development'),
  ('engagement_status', 'Discovery', 'Learning the client''s needs.', 20, 'In development'),
  ('engagement_status', 'Proposed', 'Proposal or quote submitted.', 30, 'In development'),
  ('engagement_status', 'Negotiation', 'Terms being negotiated.', 40, 'In development'),
  ('engagement_status', 'Awarded', 'Won; work not yet started.', 50, 'Generating revenue'),
  ('engagement_status', 'Active', 'Work underway and generating revenue.', 60, 'Generating revenue'),
  ('engagement_status', 'On Hold', 'Paused.', 70, 'On hold'),
  ('engagement_status', 'Completed', 'Work delivered.', 80, 'Closed out'),
  ('engagement_status', 'Closed', 'Closed out (completed, cancelled or not pursued).', 90, 'Closed out')
) AS v(field_key, value, description, sort_order, phase)
WHERE NOT EXISTS (
  SELECT 1 FROM public.portal_field_options o
  WHERE o.field_key = v.field_key AND lower(o.value) = lower(v.value)
);

-- Demo sign-in phase: same access pattern as the other portal tables. In the portal, only
-- Owner and Admin seats see Admin > Field Options. When Google sign-in goes live,
-- 2026-10-phase2-google-auth-rls.sql makes Postgres enforce that (see its Field Options section).
ALTER TABLE public.portal_field_options ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portal_field_options' AND policyname = 'Allow anon all on portal_field_options') THEN
    CREATE POLICY "Allow anon all on portal_field_options" ON public.portal_field_options FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_field_options TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Read-only check: how many choices each list has.
SELECT field_key, count(*) AS choices
FROM public.portal_field_options
GROUP BY field_key
ORDER BY field_key;
