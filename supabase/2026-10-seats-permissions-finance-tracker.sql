-- =============================================================================
-- DATAISDATA COMMAND CENTER — OCTOBER 2026 MIGRATION
-- Seats, roles & permissions  +  Finance Tracker  +  Finance fixes
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. It is idempotent (safe to run more than once).
--
-- Requires the existing tables from schema.sql, finance-schema.sql and
-- seed-tony-data.sql (accounts, engagements, contractors, invoices, payments,
-- expenses ...).
--
-- NOTE ON SECURITY: during the demo-login phase the portal still uses the anon
-- key, so these tables get the same "anon all" policies as the rest of the app.
-- When Google sign-in goes live, run 2026-10-phase2-google-auth-rls.sql which
-- replaces every anon policy with real per-user, per-module rules.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) SEATS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT NOT NULL,
    title TEXT,
    organization TEXT,
    seat_role TEXT NOT NULL DEFAULT 'member'
        CHECK (seat_role IN ('owner', 'admin', 'member', 'guest')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'invited', 'suspended')),
    scope_mode TEXT NOT NULL DEFAULT 'all'
        CHECK (scope_mode IN ('all', 'accounts')),
    hidden_modules TEXT[] NOT NULL DEFAULT '{}',
    auth_user_id UUID,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails are matched case-insensitively at Google sign-in; one seat per email.
CREATE UNIQUE INDEX IF NOT EXISTS portal_users_email_key
    ON public.portal_users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS portal_users_auth_user_id_key
    ON public.portal_users (auth_user_id) WHERE auth_user_id IS NOT NULL;
-- Exactly one Owner seat.
CREATE UNIQUE INDEX IF NOT EXISTS portal_users_single_owner
    ON public.portal_users ((seat_role)) WHERE seat_role = 'owner';

CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.user_account_scopes (
    user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_name TEXT,
    action TEXT NOT NULL,
    target_user_id UUID,
    target_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_audit_log_created_idx ON public.portal_audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.portal_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    seat_limit INT NOT NULL DEFAULT 10,
    organization_name TEXT NOT NULL DEFAULT 'DataIsData',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.portal_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Seed the first three seats (fixed IDs so the demo logins line up).
-- John's email is left blank on purpose: add his real sign-in email in
-- Users & Permissions before switching to Google sign-in.
INSERT INTO public.portal_users (id, email, full_name, title, organization, seat_role, status, scope_mode)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'tony@dataisdata.com',   'Tony Wood',   'Founder & CEO', 'DataIsData', 'owner', 'active', 'all'),
  ('a1000000-0000-4000-8000-000000000002', 'azaiah@dataisdata.com', 'Azaiah Wood', 'Developer',     'DataIsData', 'admin', 'active', 'all'),
  ('a1000000-0000-4000-8000-000000000003', NULL,                    'John Kissel', 'Director of Innovation & Technology', 'Virginia DMAS', 'guest', 'active', 'all')
ON CONFLICT (id) DO NOTHING;
-- John starts with NO module permissions (admins turn things on in the portal).

-- -----------------------------------------------------------------------------
-- 2) FINANCE FIXES ON EXISTING TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms_days INT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Expense recurrence values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurrence_check') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_recurrence_check
      CHECK (recurrence IN ('none', 'monthly', 'quarterly', 'annual'));
  END IF;
END $$;

-- Robust invoice numbering: ignores any invoice numbers that are not INV-<digits>.
-- SECURITY DEFINER so the next number is computed across ALL invoices, even for a
-- seat that can only see some accounts (prevents duplicate-number errors).
CREATE OR REPLACE FUNCTION public.next_invoice_number() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  last_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(substring(invoice_number FROM '^INV-(\d+)$') AS INT)), 0)
    INTO last_num
    FROM public.invoices;
  RETURN 'INV-' || LPAD((last_num + 1)::TEXT, 4, '0');
END;
$$;

-- Keep invoice status honest: mark Sent invoices Overdue once past due, and put
-- them back to Sent if the due date moves into the future. Called by the portal.
-- Uses the Virginia calendar date (not the server's UTC date) so an invoice due
-- "today" never flips to Overdue at 8pm Eastern.
CREATE OR REPLACE FUNCTION public.sync_invoice_statuses() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  changed INT := 0;
  n INT;
  today DATE := (now() AT TIME ZONE 'America/New_York')::date;
BEGIN
  UPDATE public.invoices SET status = 'Overdue', updated_at = now()
   WHERE status = 'Sent' AND due_date IS NOT NULL AND due_date < today;
  GET DIAGNOSTICS n = ROW_COUNT; changed := changed + n;

  UPDATE public.invoices SET status = 'Sent', updated_at = now()
   WHERE status = 'Overdue' AND (due_date IS NULL OR due_date >= today);
  GET DIAGNOSTICS n = ROW_COUNT; changed := changed + n;
  RETURN changed;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) FINANCE TRACKER
-- -----------------------------------------------------------------------------

-- Company-wide finance assumptions (single row). Every value is editable in
-- Finance Tracker → Settings; these are only starting defaults.
CREATE TABLE IF NOT EXISTS public.finance_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    fiscal_year_start_month INT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    annual_revenue_target NUMERIC(15,2) NOT NULL DEFAULT 0,
    target_gross_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 25,
    target_net_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 12,
    tax_reserve_pct NUMERIC(5,2) NOT NULL DEFAULT 25,
    default_burden_pct NUMERIC(5,2) NOT NULL DEFAULT 18,
    default_payment_terms_days INT NOT NULL DEFAULT 30,
    min_cash_runway_months NUMERIC(5,2) NOT NULL DEFAULT 3,
    opening_cash_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    opening_cash_as_of DATE,
    monthly_overhead_estimate NUMERIC(15,2) NOT NULL DEFAULT 0,
    concentration_warning_pct NUMERIC(5,2) NOT NULL DEFAULT 40,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.finance_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Staff-augmentation placements: who is billed where, at what rate, and what we pay them.
CREATE TABLE IF NOT EXISTS public.placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
    role_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Pending', 'Active', 'On Hold', 'Ended')),
    start_date DATE,
    end_date DATE,
    bill_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    pay_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    pay_type TEXT NOT NULL DEFAULT 'W2' CHECK (pay_type IN ('W2', '1099', 'C2C')),
    burden_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 40,
    payment_terms_days INT,
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS placements_account_idx ON public.placements (account_id);
CREATE INDEX IF NOT EXISTS placements_engagement_idx ON public.placements (engagement_id);
CREATE INDEX IF NOT EXISTS placements_contractor_idx ON public.placements (contractor_id);

-- Hours worked per placement per period. Rates are snapshotted so history never changes.
CREATE TABLE IF NOT EXISTS public.placement_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    hours NUMERIC(8,2) NOT NULL CHECK (hours >= 0),
    bill_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    pay_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    burden_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS placement_hours_placement_idx ON public.placement_hours (placement_id);
CREATE INDEX IF NOT EXISTS placement_hours_invoice_idx ON public.placement_hours (invoice_id);

-- Money in that is not an invoice payment (grants, interest, reimbursements, owner contributions...).
CREATE TABLE IF NOT EXISTS public.income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other Income',
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly budget per expense category.
CREATE TABLE IF NOT EXISTS public.finance_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE,
    monthly_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-defined fields (add / remove in the portal) including calculated formula fields.
CREATE TABLE IF NOT EXISTS public.finance_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity TEXT NOT NULL CHECK (entity IN ('placement', 'expense', 'invoice', 'income')),
    field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{0,39}$'),
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('number', 'currency', 'percent', 'text', 'date', 'select', 'formula')),
    formula TEXT,
    result_format TEXT NOT NULL DEFAULT 'number' CHECK (result_format IN ('number', 'currency', 'percent')),
    options TEXT[] NOT NULL DEFAULT '{}',
    aggregate TEXT NOT NULL DEFAULT 'sum' CHECK (aggregate IN ('none', 'sum', 'avg', 'min', 'max')),
    show_in_reports BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity, field_key)
);

-- -----------------------------------------------------------------------------
-- 4) DEMO-PHASE POLICIES (anon key) — replaced by the phase-2 RLS file later
-- -----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'portal_users','user_permissions','user_account_scopes','portal_audit_log','portal_settings',
    'finance_settings','placements','placement_hours','income_entries','finance_budgets','finance_custom_fields'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'Allow anon all on ' || t) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', 'Allow anon all on ' || t, t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.portal_users, public.user_permissions, public.user_account_scopes, public.portal_audit_log,
  public.portal_settings, public.finance_settings, public.placements, public.placement_hours,
  public.income_entries, public.finance_budgets, public.finance_custom_fields
TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invoice_statuses() TO anon, authenticated;

-- Make the new tables visible to the API immediately.
NOTIFY pgrst, 'reload schema';
