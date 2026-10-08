-- =============================================================================
-- DATAISDATA COMMAND CENTER — PHASE 2: GOOGLE SIGN-IN + DATABASE-ENFORCED ACCESS
--
-- !!! DO NOT RUN THIS UNTIL GOOGLE SIGN-IN IS SET UP AND TESTED !!!
-- Running it removes every "anon" (no-login) policy. After it runs, the portal
-- only works for people signed in with a Google/email account that matches an
-- active seat in Users & Permissions. The demo buttons + PIN will stop working.
--
-- Order of operations (see SETUP-GOOGLE-SIGNIN.md):
--   1. Supabase → Authentication → Providers → enable Google (and Email).
--   2. Netlify env: NEXT_PUBLIC_AUTH_MODE=google, redeploy.
--   3. Make sure every seat has the right sign-in email in Users & Permissions.
--   4. Run THIS file in the Supabase SQL editor.
--
-- What it does: every table gets row-level security that mirrors the portal's
-- permission switches (view / add / edit / delete per section) and the
-- "only specific accounts" record scope — enforced by Postgres itself, so the
-- rules hold even if someone calls the API directly.
-- Idempotent: safe to run more than once.
-- =============================================================================

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS related_account_ids uuid[];

-- -----------------------------------------------------------------------------
-- 1) Identity & permission helpers (SECURITY DEFINER = they can read the seat
--    tables even though those tables are protected too)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.portal_me_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Match the signed-in Supabase user to a seat by their CONFIRMED email address
  -- (auth.users.email_confirmed_at), so nobody can claim a seat with an
  -- unverified sign-up. auth_user_id must also agree when it has been linked.
  SELECT u.id FROM public.portal_users u
    JOIN auth.users au ON au.id = auth.uid()
   WHERE u.status = 'active'
     AND u.email IS NOT NULL
     AND au.email_confirmed_at IS NOT NULL
     AND lower(u.email) = lower(au.email)
     AND (u.auth_user_id IS NULL OR u.auth_user_id = au.id)
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.portal_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.portal_users u WHERE u.id = public.portal_me_id() AND u.seat_role IN ('owner','admin'))
$$;

CREATE OR REPLACE FUNCTION public.portal_can(p_module text, p_action text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.portal_me_id() IS NULL THEN false
    WHEN public.portal_is_admin() THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions p
       WHERE p.user_id = public.portal_me_id() AND p.module_key = p_module AND p.can_view
         AND (p_action = 'view'
              OR (p_action = 'create' AND p.can_create)
              OR (p_action = 'edit' AND p.can_edit)
              OR (p_action = 'delete' AND p.can_delete)))
  END
$$;

CREATE OR REPLACE FUNCTION public.portal_can_view_any(p_modules text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.portal_me_id() IS NULL THEN false
    WHEN public.portal_is_admin() THEN true
    ELSE EXISTS (SELECT 1 FROM public.user_permissions p
                  WHERE p.user_id = public.portal_me_id() AND p.module_key = ANY (p_modules) AND p.can_view)
  END
$$;

CREATE OR REPLACE FUNCTION public.portal_can_write_any(p_modules text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.portal_me_id() IS NULL THEN false
    WHEN public.portal_is_admin() THEN true
    ELSE EXISTS (SELECT 1 FROM public.user_permissions p
                  WHERE p.user_id = public.portal_me_id() AND p.module_key = ANY (p_modules)
                    AND p.can_view AND (p.can_create OR p.can_edit OR p.can_delete))
  END
$$;

-- TRUE when the signed-in seat may see every record (admins, or scope = all).
CREATE OR REPLACE FUNCTION public.portal_all_records() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_is_admin()
      OR EXISTS (SELECT 1 FROM public.portal_users u WHERE u.id = public.portal_me_id() AND u.scope_mode = 'all')
$$;

CREATE OR REPLACE FUNCTION public.portal_account_ok(p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR (p_account IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.user_account_scopes s WHERE s.user_id = public.portal_me_id() AND s.account_id = p_account))
$$;

CREATE OR REPLACE FUNCTION public.portal_engagement_ok(p_engagement uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR EXISTS (SELECT 1 FROM public.engagements e WHERE e.id = p_engagement AND public.portal_account_ok(e.account_id))
$$;

CREATE OR REPLACE FUNCTION public.portal_invoice_ok(p_invoice uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = p_invoice AND public.portal_account_ok(i.account_id))
$$;

CREATE OR REPLACE FUNCTION public.portal_placement_ok(p_placement uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR EXISTS (SELECT 1 FROM public.placements p WHERE p.id = p_placement AND public.portal_account_ok(p.account_id))
$$;

CREATE OR REPLACE FUNCTION public.portal_contractor_ok(p_contractor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR EXISTS (SELECT 1 FROM public.engagement_contractors ec JOIN public.engagements e ON e.id = ec.engagement_id
                  WHERE ec.contractor_id = p_contractor AND public.portal_account_ok(e.account_id))
      OR EXISTS (SELECT 1 FROM public.placements p WHERE p.contractor_id = p_contractor AND public.portal_account_ok(p.account_id))
$$;

CREATE OR REPLACE FUNCTION public.portal_contact_ok(p_contact uuid, p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR (p_account IS NOT NULL AND public.portal_account_ok(p_account))
      OR EXISTS (SELECT 1 FROM public.account_contacts ac WHERE ac.contact_id = p_contact AND public.portal_account_ok(ac.account_id))
$$;

CREATE OR REPLACE FUNCTION public.portal_opportunity_ok(p_account uuid, p_related uuid[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR (p_account IS NOT NULL AND public.portal_account_ok(p_account))
      OR EXISTS (SELECT 1 FROM public.user_account_scopes s
                  WHERE s.user_id = public.portal_me_id() AND s.account_id = ANY (coalesce(p_related, '{}')))
$$;

REVOKE ALL ON FUNCTION public.portal_me_id(), public.portal_is_admin(), public.portal_can(text, text),
  public.portal_can_view_any(text[]), public.portal_can_write_any(text[]), public.portal_all_records(),
  public.portal_account_ok(uuid), public.portal_engagement_ok(uuid), public.portal_invoice_ok(uuid),
  public.portal_placement_ok(uuid), public.portal_contractor_ok(uuid), public.portal_contact_ok(uuid, uuid),
  public.portal_opportunity_ok(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_me_id(), public.portal_is_admin(), public.portal_can(text, text),
  public.portal_can_view_any(text[]), public.portal_can_write_any(text[]), public.portal_all_records(),
  public.portal_account_ok(uuid), public.portal_engagement_ok(uuid), public.portal_invoice_ok(uuid),
  public.portal_placement_ok(uuid), public.portal_contractor_ok(uuid), public.portal_contact_ok(uuid, uuid),
  public.portal_opportunity_ok(uuid, uuid[]) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Remove every demo-phase "anon" policy and any earlier version of these policies
-- -----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
            WHERE schemaname = 'public' AND (policyname LIKE 'Allow anon all on %' OR policyname LIKE 'portal\_%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 3) Business tables
-- -----------------------------------------------------------------------------

-- accounts
DO $$ BEGIN
  IF to_regclass('public.accounts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.accounts FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['dashboard','reports','documents','accounts','contacts','partners','contractors','engagements','activities','pipeline','finance_dashboard','finance_tracker','invoices','expenses','payments','pnl','innovation_portfolio','innovation_maturity','vendor_inquiries','vendor_applications','events','client_intake']) AND (public.portal_account_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.accounts FOR INSERT TO authenticated WITH CHECK (public.portal_can('accounts','create') AND (public.portal_account_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.accounts FOR UPDATE TO authenticated USING (public.portal_can('accounts','edit') AND (public.portal_account_ok(id))) WITH CHECK (public.portal_can('accounts','edit') AND (public.portal_account_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.accounts FOR DELETE TO authenticated USING (public.portal_can('accounts','delete') AND (public.portal_account_ok(id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated';
    EXECUTE 'REVOKE ALL ON public.accounts FROM anon';
  END IF;
END $$;

-- contacts
DO $$ BEGIN
  IF to_regclass('public.contacts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.contacts FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['contacts','accounts','pipeline','activities','engagements','client_intake','dashboard']) AND (public.portal_contact_ok(id, account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.contacts FOR INSERT TO authenticated WITH CHECK (public.portal_can('contacts','create') AND (public.portal_contact_ok(id, account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.contacts FOR UPDATE TO authenticated USING (public.portal_can('contacts','edit') AND (public.portal_contact_ok(id, account_id))) WITH CHECK (public.portal_can('contacts','edit') AND (public.portal_contact_ok(id, account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.contacts FOR DELETE TO authenticated USING (public.portal_can('contacts','delete') AND (public.portal_contact_ok(id, account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated';
    EXECUTE 'REVOKE ALL ON public.contacts FROM anon';
  END IF;
END $$;

-- account_contacts
DO $$ BEGIN
  IF to_regclass('public.account_contacts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.account_contacts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.account_contacts FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['contacts','accounts']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.account_contacts FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['contacts','accounts']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.account_contacts FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['contacts','accounts']) AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can_write_any(ARRAY['contacts','accounts']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.account_contacts FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['contacts','accounts']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_contacts TO authenticated';
    EXECUTE 'REVOKE ALL ON public.account_contacts FROM anon';
  END IF;
END $$;

-- engagements
DO $$ BEGIN
  IF to_regclass('public.engagements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.engagements FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['engagements','accounts','contractors','activities','documents','reports','dashboard','pipeline','finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.engagements FOR INSERT TO authenticated WITH CHECK (public.portal_can('engagements','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.engagements FOR UPDATE TO authenticated USING (public.portal_can('engagements','edit') AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can('engagements','edit') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.engagements FOR DELETE TO authenticated USING (public.portal_can('engagements','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagements TO authenticated';
    EXECUTE 'REVOKE ALL ON public.engagements FROM anon';
  END IF;
END $$;

-- engagement_contractors
DO $$ BEGIN
  IF to_regclass('public.engagement_contractors') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.engagement_contractors ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.engagement_contractors FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['engagements','contractors','accounts','contacts','partners','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.engagement_contractors FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.engagement_contractors FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id))) WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.engagement_contractors FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_contractors TO authenticated';
    EXECUTE 'REVOKE ALL ON public.engagement_contractors FROM anon';
  END IF;
END $$;

-- engagement_contacts
DO $$ BEGIN
  IF to_regclass('public.engagement_contacts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.engagement_contacts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.engagement_contacts FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['engagements','contractors','accounts','contacts','partners','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.engagement_contacts FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.engagement_contacts FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id))) WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.engagement_contacts FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_contacts TO authenticated';
    EXECUTE 'REVOKE ALL ON public.engagement_contacts FROM anon';
  END IF;
END $$;

-- engagement_partners
DO $$ BEGIN
  IF to_regclass('public.engagement_partners') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.engagement_partners ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.engagement_partners FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['engagements','contractors','accounts','contacts','partners','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.engagement_partners FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.engagement_partners FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id))) WITH CHECK (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.engagement_partners FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['engagements','contractors','finance_tracker']) AND (public.portal_engagement_ok(engagement_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_partners TO authenticated';
    EXECUTE 'REVOKE ALL ON public.engagement_partners FROM anon';
  END IF;
END $$;

-- opportunities
DO $$ BEGIN
  IF to_regclass('public.opportunities') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.opportunities FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['pipeline','accounts','contacts','activities','documents','reports','dashboard','finance_tracker']) AND (public.portal_opportunity_ok(account_id, related_account_ids)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.opportunities FOR INSERT TO authenticated WITH CHECK (public.portal_can('pipeline','create') AND (public.portal_opportunity_ok(account_id, related_account_ids)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.opportunities FOR UPDATE TO authenticated USING (public.portal_can('pipeline','edit') AND (public.portal_opportunity_ok(account_id, related_account_ids))) WITH CHECK (public.portal_can('pipeline','edit') AND (public.portal_opportunity_ok(account_id, related_account_ids)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.opportunities FOR DELETE TO authenticated USING (public.portal_can('pipeline','delete') AND (public.portal_opportunity_ok(account_id, related_account_ids)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated';
    EXECUTE 'REVOKE ALL ON public.opportunities FROM anon';
  END IF;
END $$;

-- opportunity_partners
DO $$ BEGIN
  IF to_regclass('public.opportunity_partners') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.opportunity_partners ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.opportunity_partners FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['pipeline','partners']) AND (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.opportunity_partners FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['pipeline']) AND (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.opportunity_partners FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['pipeline']) AND (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id))) WITH CHECK (public.portal_can_write_any(ARRAY['pipeline']) AND (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.opportunity_partners FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['pipeline']) AND (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_partners TO authenticated';
    EXECUTE 'REVOKE ALL ON public.opportunity_partners FROM anon';
  END IF;
END $$;

-- activities
DO $$ BEGIN
  IF to_regclass('public.activities') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.activities FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['activities','accounts','contacts','engagements','pipeline','documents','dashboard']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.activities FOR INSERT TO authenticated WITH CHECK (public.portal_can('activities','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.activities FOR UPDATE TO authenticated USING (public.portal_can('activities','edit') AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can('activities','edit') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.activities FOR DELETE TO authenticated USING (public.portal_can('activities','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated';
    EXECUTE 'REVOKE ALL ON public.activities FROM anon';
  END IF;
END $$;

-- activity_contacts
DO $$ BEGIN
  IF to_regclass('public.activity_contacts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.activity_contacts ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.activity_contacts FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['activities','contacts','accounts']) AND (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.activity_contacts FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['activities']) AND (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.activity_contacts FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['activities']) AND (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id))) WITH CHECK (public.portal_can_write_any(ARRAY['activities']) AND (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.activity_contacts FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['activities']) AND (EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_contacts TO authenticated';
    EXECUTE 'REVOKE ALL ON public.activity_contacts FROM anon';
  END IF;
END $$;

-- partners
DO $$ BEGIN
  IF to_regclass('public.partners') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.partners FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['partners','engagements','pipeline','vendor_applications','events','documents','reports','accounts']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.partners FOR INSERT TO authenticated WITH CHECK (public.portal_can('partners','create') OR public.portal_can('vendor_applications','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.partners FOR UPDATE TO authenticated USING (public.portal_can('partners','edit')) WITH CHECK (public.portal_can('partners','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.partners FOR DELETE TO authenticated USING (public.portal_can('partners','delete'))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated';
    EXECUTE 'REVOKE ALL ON public.partners FROM anon';
  END IF;
END $$;

-- contractors
DO $$ BEGIN
  IF to_regclass('public.contractors') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.contractors FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['contractors','engagements','accounts','expenses','finance_tracker']) AND (public.portal_contractor_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.contractors FOR INSERT TO authenticated WITH CHECK (public.portal_can('contractors','create') AND (public.portal_contractor_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.contractors FOR UPDATE TO authenticated USING (public.portal_can('contractors','edit') AND (public.portal_contractor_ok(id))) WITH CHECK (public.portal_can('contractors','edit') AND (public.portal_contractor_ok(id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.contractors FOR DELETE TO authenticated USING (public.portal_can('contractors','delete') AND (public.portal_contractor_ok(id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated';
    EXECUTE 'REVOKE ALL ON public.contractors FROM anon';
  END IF;
END $$;

-- invoices
DO $$ BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.invoices FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['invoices','payments','finance_dashboard','finance_tracker','pnl']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.portal_can('invoices','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.invoices FOR UPDATE TO authenticated USING ((public.portal_can('invoices','edit') OR public.portal_can('payments','create') OR public.portal_can('payments','delete')) AND (public.portal_account_ok(account_id))) WITH CHECK ((public.portal_can('invoices','edit') OR public.portal_can('payments','create') OR public.portal_can('payments','delete')) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.invoices FOR DELETE TO authenticated USING (public.portal_can('invoices','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated';
    EXECUTE 'REVOKE ALL ON public.invoices FROM anon';
  END IF;
END $$;

-- invoice_line_items
DO $$ BEGIN
  IF to_regclass('public.invoice_line_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.invoice_line_items FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['invoices','payments','finance_dashboard','finance_tracker','pnl']) AND (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.invoice_line_items FOR INSERT TO authenticated WITH CHECK (public.portal_can_write_any(ARRAY['invoices']) AND (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.invoice_line_items FOR UPDATE TO authenticated USING (public.portal_can_write_any(ARRAY['invoices']) AND (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id))) WITH CHECK (public.portal_can_write_any(ARRAY['invoices']) AND (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.invoice_line_items FOR DELETE TO authenticated USING (public.portal_can_write_any(ARRAY['invoices']) AND (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated';
    EXECUTE 'REVOKE ALL ON public.invoice_line_items FROM anon';
  END IF;
END $$;

-- payments
DO $$ BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.payments FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['payments','invoices','finance_dashboard','finance_tracker','pnl']) AND (public.portal_invoice_ok(invoice_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.payments FOR INSERT TO authenticated WITH CHECK (public.portal_can('payments','create') AND public.portal_invoice_ok(invoice_id))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.payments FOR UPDATE TO authenticated USING (public.portal_can('payments','delete') AND public.portal_invoice_ok(invoice_id)) WITH CHECK (public.portal_can('payments','delete') AND public.portal_invoice_ok(invoice_id))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.payments FOR DELETE TO authenticated USING (public.portal_can('payments','delete') AND public.portal_invoice_ok(invoice_id))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated';
    EXECUTE 'REVOKE ALL ON public.payments FROM anon';
  END IF;
END $$;

-- expenses
DO $$ BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.expenses FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['expenses','finance_dashboard','finance_tracker','pnl','invoices']) AND (public.portal_all_records() OR (account_id IS NOT NULL AND public.portal_account_ok(account_id)) OR (engagement_id IS NOT NULL AND public.portal_engagement_ok(engagement_id))))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.portal_can('expenses','create') AND (public.portal_all_records() OR (account_id IS NOT NULL AND public.portal_account_ok(account_id)) OR (engagement_id IS NOT NULL AND public.portal_engagement_ok(engagement_id))))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.expenses FOR UPDATE TO authenticated USING (public.portal_can('expenses','edit') AND (public.portal_all_records() OR (account_id IS NOT NULL AND public.portal_account_ok(account_id)) OR (engagement_id IS NOT NULL AND public.portal_engagement_ok(engagement_id)))) WITH CHECK (public.portal_can('expenses','edit') AND (public.portal_all_records() OR (account_id IS NOT NULL AND public.portal_account_ok(account_id)) OR (engagement_id IS NOT NULL AND public.portal_engagement_ok(engagement_id))))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.expenses FOR DELETE TO authenticated USING (public.portal_can('expenses','delete') AND (public.portal_all_records() OR (account_id IS NOT NULL AND public.portal_account_ok(account_id)) OR (engagement_id IS NOT NULL AND public.portal_engagement_ok(engagement_id))))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated';
    EXECUTE 'REVOKE ALL ON public.expenses FROM anon';
  END IF;
END $$;

-- placements
DO $$ BEGIN
  IF to_regclass('public.placements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.placements FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.placements FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.placements FOR UPDATE TO authenticated USING (public.portal_can('finance_tracker','edit') AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can('finance_tracker','edit') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.placements FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.placements TO authenticated';
    EXECUTE 'REVOKE ALL ON public.placements FROM anon';
  END IF;
END $$;

-- placement_hours
DO $$ BEGIN
  IF to_regclass('public.placement_hours') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.placement_hours ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.placement_hours FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (public.portal_placement_ok(placement_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.placement_hours FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','create') AND public.portal_placement_ok(placement_id))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.placement_hours FOR UPDATE TO authenticated USING ((public.portal_can('finance_tracker','edit') OR public.portal_can('invoices','create') OR public.portal_can('expenses','create')) AND public.portal_placement_ok(placement_id)) WITH CHECK ((public.portal_can('finance_tracker','edit') OR public.portal_can('invoices','create') OR public.portal_can('expenses','create')) AND public.portal_placement_ok(placement_id))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.placement_hours FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','delete') AND public.portal_placement_ok(placement_id))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_hours TO authenticated';
    EXECUTE 'REVOKE ALL ON public.placement_hours FROM anon';
  END IF;
END $$;

-- income_entries
DO $$ BEGIN
  IF to_regclass('public.income_entries') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.income_entries FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.income_entries FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.income_entries FOR UPDATE TO authenticated USING (public.portal_can('finance_tracker','edit') AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can('finance_tracker','edit') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.income_entries FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated';
    EXECUTE 'REVOKE ALL ON public.income_entries FROM anon';
  END IF;
END $$;

-- finance_settings
DO $$ BEGIN
  IF to_regclass('public.finance_settings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.finance_settings FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.finance_settings FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.finance_settings FOR UPDATE TO authenticated USING (public.portal_can('finance_tracker','edit')) WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.finance_settings FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated';
    EXECUTE 'REVOKE ALL ON public.finance_settings FROM anon';
  END IF;
END $$;

-- finance_budgets
DO $$ BEGIN
  IF to_regclass('public.finance_budgets') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.finance_budgets FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.finance_budgets FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.finance_budgets FOR UPDATE TO authenticated USING (public.portal_can('finance_tracker','edit')) WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.finance_budgets FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO authenticated';
    EXECUTE 'REVOKE ALL ON public.finance_budgets FROM anon';
  END IF;
END $$;

-- finance_custom_fields
DO $$ BEGIN
  IF to_regclass('public.finance_custom_fields') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.finance_custom_fields ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.finance_custom_fields FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['finance_dashboard','finance_tracker','invoices','expenses','payments','pnl']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.finance_custom_fields FOR INSERT TO authenticated WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.finance_custom_fields FOR UPDATE TO authenticated USING (public.portal_can('finance_tracker','edit')) WITH CHECK (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.finance_custom_fields FOR DELETE TO authenticated USING (public.portal_can('finance_tracker','edit'))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_custom_fields TO authenticated';
    EXECUTE 'REVOKE ALL ON public.finance_custom_fields FROM anon';
  END IF;
END $$;

-- client_intakes
DO $$ BEGIN
  IF to_regclass('public.client_intakes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.client_intakes ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.client_intakes FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['client_intake','innovation_portfolio']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.client_intakes FOR INSERT TO authenticated WITH CHECK (public.portal_can('client_intake','create'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.client_intakes FOR UPDATE TO authenticated USING (public.portal_can('client_intake','edit') AND public.portal_account_ok(account_id)) WITH CHECK (public.portal_can('client_intake','edit') AND public.portal_account_ok(account_id))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.client_intakes FOR DELETE TO authenticated USING (public.portal_can('client_intake','edit') AND public.portal_account_ok(account_id))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_intakes TO authenticated';
    EXECUTE 'REVOKE ALL ON public.client_intakes FROM anon';
  END IF;
END $$;

-- innovation_maturity_snapshots
DO $$ BEGIN
  IF to_regclass('public.innovation_maturity_snapshots') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.innovation_maturity_snapshots ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.innovation_maturity_snapshots FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['innovation_maturity','innovation_portfolio','accounts']) AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.innovation_maturity_snapshots FOR INSERT TO authenticated WITH CHECK (public.portal_can('innovation_maturity','create') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.innovation_maturity_snapshots FOR UPDATE TO authenticated USING (public.portal_can('innovation_maturity','edit') AND (public.portal_account_ok(account_id))) WITH CHECK (public.portal_can('innovation_maturity','edit') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.innovation_maturity_snapshots FOR DELETE TO authenticated USING (public.portal_can('innovation_maturity','delete') AND (public.portal_account_ok(account_id)))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.innovation_maturity_snapshots TO authenticated';
    EXECUTE 'REVOKE ALL ON public.innovation_maturity_snapshots FROM anon';
  END IF;
END $$;

-- vendor_inquiries
DO $$ BEGIN
  IF to_regclass('public.vendor_inquiries') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.vendor_inquiries ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.vendor_inquiries FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['vendor_inquiries','vendor_applications','innovation_portfolio']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.vendor_inquiries FOR INSERT TO authenticated WITH CHECK (public.portal_can('vendor_inquiries','create'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.vendor_inquiries FOR UPDATE TO authenticated USING (public.portal_can('vendor_applications','edit') OR public.portal_can('vendor_inquiries','create')) WITH CHECK (public.portal_can('vendor_applications','edit') OR public.portal_can('vendor_inquiries','create'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.vendor_inquiries FOR DELETE TO authenticated USING (public.portal_is_admin())$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_inquiries TO authenticated';
    EXECUTE 'REVOKE ALL ON public.vendor_inquiries FROM anon';
  END IF;
END $$;

-- vendor_applications
DO $$ BEGIN
  IF to_regclass('public.vendor_applications') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.vendor_applications FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['vendor_applications','vendor_inquiries','innovation_portfolio']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.vendor_applications FOR INSERT TO authenticated WITH CHECK (public.portal_can('vendor_applications','create'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.vendor_applications FOR UPDATE TO authenticated USING (public.portal_can('vendor_applications','edit')) WITH CHECK (public.portal_can('vendor_applications','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.vendor_applications FOR DELETE TO authenticated USING (public.portal_is_admin())$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_applications TO authenticated';
    EXECUTE 'REVOKE ALL ON public.vendor_applications FROM anon';
  END IF;
END $$;

-- events
DO $$ BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.events ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.events FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['events','innovation_portfolio']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.events FOR INSERT TO authenticated WITH CHECK (public.portal_can('events','create'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.events FOR UPDATE TO authenticated USING (public.portal_can('events','edit')) WITH CHECK (public.portal_can('events','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.events FOR DELETE TO authenticated USING (public.portal_is_admin())$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated';
    EXECUTE 'REVOKE ALL ON public.events FROM anon';
  END IF;
END $$;

-- event_vendors
DO $$ BEGIN
  IF to_regclass('public.event_vendors') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.event_vendors FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['events','innovation_portfolio','partners']) AND (true))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.event_vendors FOR INSERT TO authenticated WITH CHECK (public.portal_can('events','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.event_vendors FOR UPDATE TO authenticated USING (public.portal_can('events','edit')) WITH CHECK (public.portal_can('events','edit'))$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.event_vendors FOR DELETE TO authenticated USING (public.portal_can('events','edit'))$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_vendors TO authenticated';
    EXECUTE 'REVOKE ALL ON public.event_vendors FROM anon';
  END IF;
END $$;

-- p3_deals
DO $$ BEGIN
  IF to_regclass('public.p3_deals') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.p3_deals ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$CREATE POLICY portal_select ON public.p3_deals FOR SELECT TO authenticated USING (public.portal_can_view_any(ARRAY['innovation_portfolio']) AND (public.portal_account_ok(public_entity_id)))$p$;
    EXECUTE $p$CREATE POLICY portal_insert ON public.p3_deals FOR INSERT TO authenticated WITH CHECK (public.portal_can('innovation_portfolio','view') AND public.portal_is_admin())$p$;
    EXECUTE $p$CREATE POLICY portal_update ON public.p3_deals FOR UPDATE TO authenticated USING (public.portal_is_admin()) WITH CHECK (public.portal_is_admin())$p$;
    EXECUTE $p$CREATE POLICY portal_delete ON public.p3_deals FOR DELETE TO authenticated USING (public.portal_is_admin())$p$;
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.p3_deals TO authenticated';
    EXECUTE 'REVOKE ALL ON public.p3_deals FROM anon';
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4) Seat & permission tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_select ON public.portal_users FOR SELECT TO authenticated
  USING (public.portal_is_admin() OR id = public.portal_me_id());
CREATE POLICY portal_insert ON public.portal_users FOR INSERT TO authenticated WITH CHECK (public.portal_is_admin());
CREATE POLICY portal_update ON public.portal_users FOR UPDATE TO authenticated
  USING (public.portal_is_admin() OR id = public.portal_me_id())
  WITH CHECK (public.portal_is_admin() OR id = public.portal_me_id());
CREATE POLICY portal_delete ON public.portal_users FOR DELETE TO authenticated
  USING (public.portal_is_admin() AND seat_role <> 'owner');

-- Guard: people can edit their own name/title/view, but only admins change roles,
-- status, email or scope; the Owner seat can only be changed by the Owner.
CREATE OR REPLACE FUNCTION public.portal_users_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := public.portal_me_id();
  my_role text;
BEGIN
  -- SQL editor / service role (no signed-in user): allow everything.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT seat_role INTO my_role FROM public.portal_users WHERE id = me;

  IF TG_OP = 'DELETE' THEN
    IF OLD.seat_role = 'owner' THEN RAISE EXCEPTION 'The Owner seat cannot be removed'; END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.seat_role = 'owner' AND coalesce(my_role, '') <> 'owner'
       AND (NEW.seat_role IS DISTINCT FROM OLD.seat_role OR NEW.status IS DISTINCT FROM OLD.status OR NEW.email IS DISTINCT FROM OLD.email) THEN
      RAISE EXCEPTION 'Only the Owner can change the Owner seat';
    END IF;
    IF NEW.seat_role = 'owner' AND OLD.seat_role <> 'owner' THEN
      RAISE EXCEPTION 'Ownership cannot be assigned from the portal';
    END IF;
    IF coalesce(my_role, '') NOT IN ('owner', 'admin') THEN
      IF NEW.seat_role IS DISTINCT FROM OLD.seat_role OR NEW.status IS DISTINCT FROM OLD.status
         OR NEW.scope_mode IS DISTINCT FROM OLD.scope_mode OR NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Only admins can change roles, status, email or record scope';
      END IF;
      IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id AND NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Invalid sign-in link';
      END IF;
    END IF;
    IF me = OLD.id AND (NEW.seat_role IS DISTINCT FROM OLD.seat_role OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'You cannot change your own role or status';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS portal_users_guard ON public.portal_users;
CREATE TRIGGER portal_users_guard BEFORE UPDATE OR DELETE ON public.portal_users
  FOR EACH ROW EXECUTE FUNCTION public.portal_users_guard();

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_select ON public.user_permissions FOR SELECT TO authenticated
  USING (public.portal_is_admin() OR user_id = public.portal_me_id());
CREATE POLICY portal_write ON public.user_permissions FOR ALL TO authenticated
  USING (public.portal_is_admin()) WITH CHECK (public.portal_is_admin());

ALTER TABLE public.user_account_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_select ON public.user_account_scopes FOR SELECT TO authenticated
  USING (public.portal_is_admin() OR user_id = public.portal_me_id());
CREATE POLICY portal_write ON public.user_account_scopes FOR ALL TO authenticated
  USING (public.portal_is_admin()) WITH CHECK (public.portal_is_admin());

ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_select ON public.portal_audit_log FOR SELECT TO authenticated USING (public.portal_is_admin());
CREATE POLICY portal_insert ON public.portal_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.portal_me_id() IS NOT NULL AND actor_id = public.portal_me_id());

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_select ON public.portal_settings FOR SELECT TO authenticated USING (public.portal_me_id() IS NOT NULL);
CREATE POLICY portal_write ON public.portal_settings FOR ALL TO authenticated
  USING (public.portal_is_admin()) WITH CHECK (public.portal_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_users, public.user_permissions, public.user_account_scopes,
  public.portal_audit_log, public.portal_settings TO authenticated;
REVOKE ALL ON public.portal_users, public.user_permissions, public.user_account_scopes,
  public.portal_audit_log, public.portal_settings FROM anon;

GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invoice_statuses() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(), public.sync_invoice_statuses() FROM anon;

-- -----------------------------------------------------------------------------
-- 5) File uploads (crm-attachments bucket): signed-in seats only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anon uploads to crm-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read crm-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update crm-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete crm-attachments" ON storage.objects;
DROP POLICY IF EXISTS "portal_attachments_rw" ON storage.objects;
CREATE POLICY "portal_attachments_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'crm-attachments' AND public.portal_me_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'crm-attachments' AND public.portal_me_id() IS NOT NULL);
-- NOTE: the bucket itself is still "Public", so anyone with a file's exact URL can open it.
-- For stricter privacy switch the bucket to Private and use signed URLs (ask Claude to do this next).

NOTIFY pgrst, 'reload schema';
