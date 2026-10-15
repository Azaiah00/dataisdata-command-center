-- =============================================================================
-- DATAISDATA COMMAND CENTER — VENDOR & EVENT MODULE (Innovation)
--
-- Run in Supabase → SQL Editor. Safe to run more than once.
--
-- What it adds (nothing is removed or renamed):
--   * Private invite links on vendor inquiries, vendor ↔ partner link
--   * Per-criterion scores, decision notes and the conflict-of-interest check on applications
--   * Category on partners (used to match approved vendors to localities)
--   * Paid flag on event sponsorships, locality invitations + RSVPs, vendor spot requests,
--     event follow-up tasks
--   * Review fields on client intakes (organization type, advisory engagement, reviewer)
--   * An activity log for the module
--   * Vendor logins: links a Guest seat to one partner (portal_user_partners)
--   * Public functions (no login) for the interest form, the invite-only application and
--     the Innovation Assessment, plus the city and vendor portal functions.
--
-- Works in today's demo-login phase. When Google sign-in goes live, run
-- 2026-10-phase2-google-auth-rls.sql — its last section covers these tables too.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Make sure the Innovation tables exist (same definitions as iaas-schema.sql)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.vendor_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    primary_contact TEXT,
    title TEXT,
    email TEXT,
    website TEXT,
    core_service_category TEXT,
    worked_public_sector BOOLEAN,
    states TEXT,
    brief_description TEXT CHECK (char_length(brief_description) <= 500),
    interested_in TEXT[],
    status TEXT DEFAULT 'Unscreened Inquiry',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.vendor_inquiries(id) ON DELETE SET NULL,
    years_in_business INTEGER,
    legal_structure TEXT,
    certifications TEXT[],
    insurance_coverage TEXT,
    contract_vehicles TEXT,
    public_sector_references TEXT,
    core_offerings TEXT,
    problem_solved TEXT,
    existing_gov_clients TEXT,
    differentiator TEXT,
    technology_stack TEXT,
    integration_capabilities TEXT,
    annual_revenue_range TEXT,
    bonding_capacity TEXT,
    growth_pct DECIMAL(5,2),
    cost_reduction_explanation TEXT,
    strategic_alignment TEXT,
    open_to_revenue_share BOOLEAN,
    security_certifications TEXT,
    data_handling_practices TEXT,
    compliance_standards TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    status TEXT DEFAULT 'Pending Review',
    reviewed_by TEXT,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name TEXT NOT NULL,
    population_size INTEGER,
    annual_it_budget DECIMAL(15,2),
    top_challenges TEXT[],
    current_initiatives TEXT,
    grant_funding_interest BOOLEAN,
    strategic_plan_link TEXT,
    interested_in TEXT[],
    contact_name TEXT,
    contact_email TEXT,
    contact_title TEXT,
    status TEXT DEFAULT 'New',
    assigned_tier TEXT,
    advisory_estimate DECIMAL(15,2),
    readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    event_date DATE,
    theme TEXT,
    target_audience TEXT,
    registration_link TEXT,
    cost_to_vendor DECIMAL(15,2),
    cost_to_attendees DECIMAL(15,2),
    notes TEXT,
    post_event_leads INTEGER,
    revenue_generated DECIMAL(15,2),
    status TEXT DEFAULT 'Planned',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_vendors (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    sponsorship_tier TEXT,
    fee DECIMAL(15,2),
    PRIMARY KEY (event_id, partner_id)
);

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS vendor_score INTEGER;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS vendor_status TEXT;

-- -----------------------------------------------------------------------------
-- 1) New columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS invite_token TEXT;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'team';
CREATE UNIQUE INDEX IF NOT EXISTS vendor_inquiries_invite_token_key ON public.vendor_inquiries (invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS criteria_scores JSONB;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS coi_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'team';

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS innovation_category TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS public_description TEXT;

ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS organization_type TEXT;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS advisory_engagement BOOLEAN DEFAULT false;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'team';

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Sample records loaded by "Load sample data" on the module overview (removed by "Remove sample data").
ALTER TABLE public.vendor_inquiries ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE public.vendor_applications ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false;

ALTER TABLE public.event_vendors ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false;
ALTER TABLE public.event_vendors ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.event_vendors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- -----------------------------------------------------------------------------
-- 2) New tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_attendees (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    rsvp TEXT CHECK (rsvp IN ('yes', 'no')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (event_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.event_vendor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    sponsorship_tier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
    requested_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    decided_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS event_vendor_requests_one_pending
    ON public.event_vendor_requests (event_id, partner_id) WHERE status = 'Pending';

CREATE TABLE IF NOT EXISTS public.event_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 300),
    done BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.innovation_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    actor_name TEXT,
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    ref_type TEXT,
    ref_id UUID
);
CREATE INDEX IF NOT EXISTS innovation_activity_created_idx ON public.innovation_activity (created_at DESC);

-- Vendor logins: a Guest seat that belongs to one partner.
DO $$ BEGIN
  IF to_regclass('public.portal_users') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.portal_user_partners (
      user_id UUID PRIMARY KEY REFERENCES public.portal_users(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now())';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Demo-phase access (same rule as rls-policies.sql: the anon key can read/write).
--    Phase 2 removes these and replaces them with per-seat rules.
-- -----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendor_inquiries','vendor_applications','client_intakes','events','event_vendors',
                           'event_attendees','event_vendor_requests','event_tasks','innovation_activity','portal_user_partners']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Only add the open policy while the portal is still in the demo phase
      -- (phase 2 deletes the "Allow anon all on accounts" policy).
      IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Allow anon all on accounts')
         AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'Allow anon all on ' || t) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', 'Allow anon all on ' || t, t);
      END IF;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Helpers
-- -----------------------------------------------------------------------------
-- TRUE while the portal is in the demo-login phase (anon key has open access).
CREATE OR REPLACE FUNCTION public.vem_demo_phase() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts'
                  AND policyname = 'Allow anon all on accounts')
$$;

CREATE OR REPLACE FUNCTION public.vem_clean(p text, p_max int) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(left(btrim(coalesce(p, '')), p_max), '')
$$;

-- "$2.5M", "750k", "1,200,000" -> numeric (NULL when it cannot be read)
CREATE OR REPLACE FUNCTION public.vem_money(p text) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text := lower(regexp_replace(coalesce(p, ''), '[\s$,]', '', 'g')); m text[];
BEGIN
  m := regexp_match(s, '^(\d{1,12}(?:\.\d+)?)(k|m|mm|b)?$');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN round(m[1]::numeric * CASE m[2] WHEN 'k' THEN 1000 WHEN 'm' THEN 1000000 WHEN 'mm' THEN 1000000 WHEN 'b' THEN 1000000000 ELSE 1 END, 2);
END $$;

CREATE OR REPLACE FUNCTION public.vem_text_array(p jsonb, p_max_items int DEFAULT 20) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p IS NULL OR jsonb_typeof(p) <> 'array' THEN NULL
         ELSE (SELECT array_agg(left(btrim(x), 120)) FROM (
                 SELECT jsonb_array_elements_text(p) AS x LIMIT p_max_items) s WHERE btrim(x) <> '') END
$$;

-- Who is calling: in phase 2 the signed-in seat must have the module and (for scoped
-- seats) the record; in the demo phase the portal itself controls access.
CREATE OR REPLACE FUNCTION public.vem_seat_ok(p_module text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.vem_demo_phase() THEN RETURN true; END IF;
  IF to_regprocedure('public.portal_can(text,text)') IS NULL THEN RETURN false; END IF;
  RETURN public.portal_can(p_module, 'view');
END $$;

CREATE OR REPLACE FUNCTION public.vem_account_ok(p_account uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.vem_demo_phase() THEN RETURN true; END IF;
  IF to_regprocedure('public.portal_account_ok(uuid)') IS NULL THEN RETURN false; END IF;
  RETURN public.portal_account_ok(p_account);
END $$;

CREATE OR REPLACE FUNCTION public.vem_partner_ok(p_partner uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.vem_demo_phase() THEN RETURN true; END IF;
  IF to_regprocedure('public.portal_me_id()') IS NULL THEN RETURN false; END IF;
  IF public.portal_is_admin() THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM public.portal_user_partners l WHERE l.user_id = public.portal_me_id() AND l.partner_id = p_partner);
END $$;

-- -----------------------------------------------------------------------------
-- 5) Public functions (no login): interest form, invite-only application, assessment
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_vendor_inquiry(p jsonb) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_company text := public.vem_clean(p->>'company_name', 200);
  v_email text := lower(public.vem_clean(p->>'email', 200));
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Company name is required' USING ERRCODE = '22023'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023'; END IF;
  IF public.vem_clean(p->>'brief_description', 500) IS NULL THEN RAISE EXCEPTION 'A brief description is required' USING ERRCODE = '22023'; END IF;
  -- Light duplicate guard: the same email can submit once every 10 minutes.
  IF EXISTS (SELECT 1 FROM public.vendor_inquiries WHERE lower(email) = v_email AND created_at > now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'We already received an inquiry from this email. Thank you!' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.vendor_inquiries (company_name, primary_contact, title, email, website, core_service_category,
      worked_public_sector, states, brief_description, interested_in, status, source)
  VALUES (v_company, public.vem_clean(p->>'primary_contact', 200), public.vem_clean(p->>'title', 200), v_email,
      public.vem_clean(p->>'website', 300), public.vem_clean(p->>'core_service_category', 100),
      coalesce((p->>'worked_public_sector')::boolean, false), public.vem_clean(p->>'states', 300),
      public.vem_clean(p->>'brief_description', 500), public.vem_text_array(p->'interested_in'), 'Unscreened Inquiry', 'public')
  RETURNING id INTO v_id;
  INSERT INTO public.innovation_activity (actor_name, message, ref_type, ref_id)
  VALUES ('Public form', 'New inquiry from ' || v_company, 'vendor_inquiry', v_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_vendor_invitation(p_token text)
RETURNS TABLE (inquiry_id uuid, company_name text, primary_contact text, email text, can_apply boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.company_name, i.primary_contact, i.email,
         (i.status = 'Invited to Apply' AND NOT EXISTS (SELECT 1 FROM public.vendor_applications a WHERE a.inquiry_id = i.id))
    FROM public.vendor_inquiries i
   WHERE p_token IS NOT NULL AND length(p_token) >= 16 AND i.invite_token = p_token
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.submit_vendor_application(p_token text, p jsonb) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inq public.vendor_inquiries%ROWTYPE;
  v_id uuid;
  v_years int;
  v_growth numeric;
BEGIN
  SELECT * INTO v_inq FROM public.vendor_inquiries WHERE p_token IS NOT NULL AND length(p_token) >= 16 AND invite_token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This link is not valid' USING ERRCODE = '22023'; END IF;
  IF v_inq.status <> 'Invited to Apply' OR EXISTS (SELECT 1 FROM public.vendor_applications a WHERE a.inquiry_id = v_inq.id) THEN
    RAISE EXCEPTION 'This application has already been submitted' USING ERRCODE = '22023';
  END IF;
  IF public.vem_clean(p->>'core_offerings', 1000) IS NULL OR public.vem_clean(p->>'problem_solved', 2000) IS NULL
     OR public.vem_clean(p->>'cost_reduction_explanation', 2000) IS NULL OR public.vem_clean(p->>'legal_structure', 100) IS NULL THEN
    RAISE EXCEPTION 'Please complete the required fields' USING ERRCODE = '22023';
  END IF;
  v_years := CASE WHEN (p->>'years_in_business') ~ '^\s*\d{1,3}\s*$' THEN (p->>'years_in_business')::int END;
  IF v_years IS NULL THEN RAISE EXCEPTION 'Years in business must be a number' USING ERRCODE = '22023'; END IF;
  v_growth := CASE WHEN (p->>'growth_pct') ~ '^\s*-?\d{1,3}(\.\d+)?\s*$' THEN round((p->>'growth_pct')::numeric, 2) END;

  INSERT INTO public.vendor_applications (inquiry_id, years_in_business, legal_structure, certifications, insurance_coverage,
      contract_vehicles, public_sector_references, core_offerings, problem_solved, existing_gov_clients, differentiator,
      technology_stack, integration_capabilities, annual_revenue_range, bonding_capacity, growth_pct,
      cost_reduction_explanation, strategic_alignment, open_to_revenue_share, security_certifications,
      data_handling_practices, compliance_standards, status, source)
  VALUES (v_inq.id, v_years, public.vem_clean(p->>'legal_structure', 100), public.vem_text_array(p->'certifications'),
      public.vem_clean(p->>'insurance_coverage', 500), public.vem_clean(p->>'contract_vehicles', 500),
      public.vem_clean(p->>'public_sector_references', 2000), public.vem_clean(p->>'core_offerings', 1000),
      public.vem_clean(p->>'problem_solved', 2000), public.vem_clean(p->>'existing_gov_clients', 1000),
      public.vem_clean(p->>'differentiator', 1000), public.vem_clean(p->>'technology_stack', 500),
      public.vem_clean(p->>'integration_capabilities', 500), public.vem_clean(p->>'annual_revenue_range', 50),
      public.vem_clean(p->>'bonding_capacity', 200), v_growth, public.vem_clean(p->>'cost_reduction_explanation', 2000),
      public.vem_clean(p->>'strategic_alignment', 2000), CASE p->>'open_to_revenue_share' WHEN 'yes' THEN true WHEN 'no' THEN false ELSE NULL END,
      public.vem_clean(p->>'security_certifications', 500), public.vem_clean(p->>'data_handling_practices', 2000),
      public.vem_clean(p->>'compliance_standards', 500), 'Pending Review', 'invite')
  RETURNING id INTO v_id;

  UPDATE public.vendor_inquiries SET status = 'Application Submitted' WHERE id = v_inq.id;
  INSERT INTO public.innovation_activity (actor_name, message, ref_type, ref_id)
  VALUES (coalesce(v_inq.primary_contact, v_inq.company_name), v_inq.company_name || ' submitted its partner application', 'vendor_inquiry', v_inq.id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_innovation_assessment(p jsonb) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_org text := public.vem_clean(p->>'organization_name', 200);
  v_email text := lower(public.vem_clean(p->>'contact_email', 200));
  v_challenges text[] := public.vem_text_array(p->'top_challenges', 3);
  v_pop int;
  v_budget numeric;
BEGIN
  IF v_org IS NULL OR public.vem_clean(p->>'contact_name', 200) IS NULL THEN RAISE EXCEPTION 'Organization and your name are required' USING ERRCODE = '22023'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023'; END IF;
  IF v_challenges IS NULL OR array_length(v_challenges, 1) IS NULL THEN RAISE EXCEPTION 'Choose at least one top challenge' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.client_intakes WHERE lower(contact_email) = v_email AND created_at > now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'We already received an assessment from this email. Thank you!' USING ERRCODE = '22023';
  END IF;
  v_pop := CASE WHEN regexp_replace(coalesce(p->>'population_size', ''), '[^0-9]', '', 'g') ~ '^\d{1,9}$'
                THEN regexp_replace(p->>'population_size', '[^0-9]', '', 'g')::int END;
  v_budget := public.vem_money(p->>'annual_it_budget');
  INSERT INTO public.client_intakes (organization_name, organization_type, population_size, annual_it_budget, top_challenges,
      current_initiatives, grant_funding_interest, strategic_plan_link, interested_in, contact_name, contact_email,
      contact_title, status, source)
  VALUES (v_org, public.vem_clean(p->>'organization_type', 50), v_pop, v_budget, v_challenges,
      public.vem_clean(p->>'current_initiatives', 2000), (p->>'grant_funding_interest') = 'yes',
      public.vem_clean(p->>'strategic_plan_link', 500), public.vem_text_array(p->'interested_in'),
      public.vem_clean(p->>'contact_name', 200), v_email, public.vem_clean(p->>'contact_title', 200), 'New', 'public')
  RETURNING id INTO v_id;
  INSERT INTO public.innovation_activity (actor_name, message, ref_type, ref_id)
  VALUES ('Public form', v_org || ' submitted an Innovation Assessment', 'client_intake', v_id);
  RETURN v_id;
END $$;

-- -----------------------------------------------------------------------------
-- 6) City and vendor portals
-- -----------------------------------------------------------------------------
-- Everything a city login sees, for one of its accounts.
CREATE OR REPLACE FUNCTION public.city_portal_data(p_account uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_intake jsonb;
  v_challenges text[];
BEGIN
  IF NOT public.vem_seat_ok('client_portal') OR NOT public.vem_account_ok(p_account) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT to_jsonb(x) INTO v_intake FROM (
    SELECT ci.id, ci.organization_name, ci.contact_name, ci.status, ci.assigned_tier, ci.readiness_score,
           ci.top_challenges, ci.current_initiatives, ci.interested_in, ci.advisory_engagement, ci.created_at
      FROM public.client_intakes ci WHERE ci.account_id = p_account ORDER BY ci.created_at DESC LIMIT 1) x;
  v_challenges := coalesce(ARRAY(SELECT jsonb_array_elements_text(v_intake->'top_challenges')), '{}');
  RETURN jsonb_build_object(
    'account', (SELECT jsonb_build_object('id', a.id, 'name', a.name, 'innovation_tier', a.innovation_tier, 'readiness_score', a.readiness_score)
                  FROM public.accounts a WHERE a.id = p_account),
    'intake', v_intake,
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'event_date', e.event_date, 'location', e.location, 'theme', e.theme,
        'status', e.status, 'cost_to_attendees', e.cost_to_attendees, 'rsvp', ea.rsvp,
        'sponsors', coalesce((SELECT jsonb_agg(jsonb_build_object('name', pa.name, 'tier', ev.sponsorship_tier, 'fee', ev.fee) ORDER BY ev.fee DESC NULLS LAST)
                                FROM public.event_vendors ev JOIN public.partners pa ON pa.id = ev.partner_id WHERE ev.event_id = e.id), '[]'::jsonb))
        ORDER BY e.event_date NULLS LAST)
      FROM public.event_attendees ea JOIN public.events e ON e.id = ea.event_id WHERE ea.account_id = p_account), '[]'::jsonb),
    'matches', CASE WHEN v_intake IS NULL OR v_intake->>'status' = 'New' THEN '[]'::jsonb ELSE coalesce((SELECT jsonb_agg(jsonb_build_object(
        'name', pa.name, 'category', pa.innovation_category, 'status', pa.vendor_status,
        'description', coalesce(pa.public_description, pa.capabilities)) ORDER BY pa.vendor_score DESC NULLS LAST)
      FROM public.partners pa
     WHERE pa.vendor_status IN ('Approved Innovation Partner', 'Approved Event Participant')
       AND pa.innovation_category = ANY (v_challenges)), '[]'::jsonb) END
  );
END $$;

CREATE OR REPLACE FUNCTION public.city_portal_rsvp(p_event uuid, p_account uuid, p_rsvp text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_event text;
BEGIN
  IF NOT public.vem_seat_ok('client_portal') OR NOT public.vem_account_ok(p_account) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_rsvp IS NOT NULL AND p_rsvp NOT IN ('yes', 'no') THEN RAISE EXCEPTION 'Invalid reply' USING ERRCODE = '22023'; END IF;
  UPDATE public.event_attendees SET rsvp = p_rsvp, responded_at = now() WHERE event_id = p_event AND account_id = p_account;
  IF NOT FOUND THEN RAISE EXCEPTION 'This locality is not invited to that event' USING ERRCODE = '22023'; END IF;
  SELECT name INTO v_name FROM public.accounts WHERE id = p_account;
  SELECT name INTO v_event FROM public.events WHERE id = p_event;
  INSERT INTO public.innovation_activity (actor_name, message, ref_type, ref_id)
  VALUES (v_name, v_name || CASE p_rsvp WHEN 'yes' THEN ' will attend ' WHEN 'no' THEN ' can''t attend ' ELSE ' cleared its reply to ' END || v_event, 'event', p_event);
END $$;

-- Everything a vendor login sees, for its own partner record.
CREATE OR REPLACE FUNCTION public.partner_portal_data(p_partner uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inquiry jsonb; v_app jsonb;
BEGIN
  IF NOT public.vem_seat_ok('partner_portal') OR NOT public.vem_partner_ok(p_partner) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT to_jsonb(x) INTO v_inquiry FROM (
    SELECT i.id, i.company_name, i.primary_contact, i.status, i.created_at, i.invited_at,
           CASE WHEN i.status = 'Invited to Apply' THEN i.invite_token END AS invite_token
      FROM public.vendor_inquiries i WHERE i.partner_id = p_partner ORDER BY i.created_at DESC LIMIT 1) x;
  -- Applicants see their own answers and the decision, never the score or reviewer notes.
  SELECT to_jsonb(x) INTO v_app FROM (
    SELECT a.id, a.status, a.created_at, a.decided_at, a.years_in_business, a.legal_structure, a.certifications,
           a.core_offerings, a.problem_solved, a.contract_vehicles, a.compliance_standards
      FROM public.vendor_applications a
     WHERE a.partner_id = p_partner OR a.inquiry_id = (v_inquiry->>'id')::uuid
     ORDER BY a.created_at DESC LIMIT 1) x;
  RETURN jsonb_build_object(
    'partner', (SELECT jsonb_build_object('id', p.id, 'name', p.name, 'vendor_status', p.vendor_status, 'category', p.innovation_category)
                  FROM public.partners p WHERE p.id = p_partner),
    'inquiry', v_inquiry,
    'application', v_app,
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date,
        'location', e.location, 'status', e.status, 'tier', ev.sponsorship_tier, 'fee', ev.fee, 'paid', ev.paid,
        'leads', CASE WHEN e.status = 'Completed' THEN e.post_event_leads END) ORDER BY e.event_date NULLS LAST)
      FROM public.event_vendors ev JOIN public.events e ON e.id = ev.event_id WHERE ev.partner_id = p_partner), '[]'::jsonb),
    'open_events', CASE WHEN (SELECT vendor_status FROM public.partners WHERE id = p_partner) IN ('Approved Innovation Partner', 'Approved Event Participant')
      THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date, 'location', e.location,
             'theme', e.theme, 'requested_tier', r.sponsorship_tier) ORDER BY e.event_date NULLS LAST)
        FROM public.events e
        LEFT JOIN public.event_vendor_requests r ON r.event_id = e.id AND r.partner_id = p_partner AND r.status = 'Pending'
       WHERE coalesce(e.status, 'Planned') <> 'Completed' AND (e.event_date IS NULL OR e.event_date >= current_date)
         AND NOT EXISTS (SELECT 1 FROM public.event_vendors ev WHERE ev.event_id = e.id AND ev.partner_id = p_partner)), '[]'::jsonb)
      ELSE '[]'::jsonb END
  );
END $$;

CREATE OR REPLACE FUNCTION public.partner_portal_request_spot(p_event uuid, p_partner uuid, p_tier text, p_requested_by text) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_name text; v_event text;
BEGIN
  IF NOT public.vem_seat_ok('partner_portal') OR NOT public.vem_partner_ok(p_partner) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_tier NOT IN ('Showcase', 'Premium Sponsor', 'Strategic Partner') THEN RAISE EXCEPTION 'Invalid tier' USING ERRCODE = '22023'; END IF;
  IF (SELECT vendor_status FROM public.partners WHERE id = p_partner) NOT IN ('Approved Innovation Partner', 'Approved Event Participant') THEN
    RAISE EXCEPTION 'Only approved partners can request a spot' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_vendors WHERE event_id = p_event AND partner_id = p_partner) THEN
    RAISE EXCEPTION 'You are already on this event' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.event_vendor_requests WHERE event_id = p_event AND partner_id = p_partner AND status = 'Pending') THEN
    RAISE EXCEPTION 'You already requested a spot at this event' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.event_vendor_requests (event_id, partner_id, sponsorship_tier, requested_by)
  VALUES (p_event, p_partner, p_tier, public.vem_clean(p_requested_by, 200)) RETURNING id INTO v_id;
  SELECT name INTO v_name FROM public.partners WHERE id = p_partner;
  SELECT name INTO v_event FROM public.events WHERE id = p_event;
  INSERT INTO public.innovation_activity (actor_name, message, ref_type, ref_id)
  VALUES (v_name, v_name || ' requested a ' || p_tier || ' spot at ' || v_event, 'event', p_event);
  RETURN v_id;
END $$;

-- -----------------------------------------------------------------------------
-- 7) Function permissions
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.vem_demo_phase(), public.vem_seat_ok(text), public.vem_account_ok(uuid), public.vem_partner_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vem_demo_phase() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_vendor_inquiry(jsonb), public.get_vendor_invitation(text),
  public.submit_vendor_application(text, jsonb), public.submit_innovation_assessment(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.city_portal_data(uuid), public.city_portal_rsvp(uuid, uuid, text),
  public.partner_portal_data(uuid), public.partner_portal_request_spot(uuid, uuid, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
