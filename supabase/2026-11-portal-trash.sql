-- =============================================================================
-- Portal Trash (soft delete + backup snapshots)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS where needed).
--
-- PREREQUISITE: If you get "portal_can does not exist", run FIRST:
--   2026-11-portal-trash-prerequisites.sql
-- OR the full Google-auth migration:
--   2026-10-phase2-google-auth-rls.sql
-- (You must already have run 2026-10-seats-permissions-finance-tracker.sql.)
--
-- What this does:
--   • Adds deleted_at / deleted_by to contacts, accounts, and partners
--   • Creates portal_trash — JSON backup of each deleted row + metadata
--   • Updates RLS so live lists hide deleted rows; Trash page can see backups
--
-- App routes: /trash (restore = edit permission, permanent delete = delete permission)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Soft-delete columns on contacts
-- ---------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.portal_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts (deleted_at)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.portal_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON public.accounts (deleted_at)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.portal_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partners_deleted_at ON public.partners (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Trash backup table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  display_label TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES public.portal_users(id) ON DELETE SET NULL,
  restored_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ,
  CONSTRAINT portal_trash_entity_unique UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_trash_active
  ON public.portal_trash (deleted_at DESC)
  WHERE restored_at IS NULL AND purged_at IS NULL;

ALTER TABLE public.portal_trash ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) RLS — portal_trash
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portal_trash_select ON public.portal_trash;
CREATE POLICY portal_trash_select ON public.portal_trash
  FOR SELECT TO authenticated
  USING (public.portal_can('trash'::text, 'view'::text));

DROP POLICY IF EXISTS portal_trash_insert ON public.portal_trash;
CREATE POLICY portal_trash_insert ON public.portal_trash
  FOR INSERT TO authenticated
  WITH CHECK (
    public.portal_is_admin()
    OR public.portal_can('contacts'::text, 'delete'::text)
    OR public.portal_can('accounts'::text, 'delete'::text)
    OR public.portal_can('partners'::text, 'delete'::text)
  );

DROP POLICY IF EXISTS portal_trash_update ON public.portal_trash;
CREATE POLICY portal_trash_update ON public.portal_trash
  FOR UPDATE TO authenticated
  USING (public.portal_can('trash'::text, 'edit'::text) OR public.portal_can('trash'::text, 'delete'::text))
  WITH CHECK (public.portal_can('trash'::text, 'edit'::text) OR public.portal_can('trash'::text, 'delete'::text));

-- ---------------------------------------------------------------------------
-- 4) RLS — contacts: hide soft-deleted rows unless Trash access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portal_select ON public.contacts;
CREATE POLICY portal_select ON public.contacts
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['contacts','accounts','pipeline','activities','engagements','client_intake','dashboard','trash'])
    AND public.portal_contact_ok(id, account_id)
    AND (deleted_at IS NULL OR public.portal_can('trash'::text, 'view'::text))
  );

-- Soft delete = update deleted_at (requires delete permission on contacts)
DROP POLICY IF EXISTS portal_update ON public.contacts;
CREATE POLICY portal_update ON public.contacts
  FOR UPDATE TO authenticated
  USING (public.portal_can('contacts'::text, 'edit'::text) AND public.portal_contact_ok(id, account_id))
  WITH CHECK (public.portal_can('contacts'::text, 'edit'::text) AND public.portal_contact_ok(id, account_id));

-- Hard delete still allowed for purge from Trash (delete permission)
DROP POLICY IF EXISTS portal_delete ON public.contacts;
CREATE POLICY portal_delete ON public.contacts
  FOR DELETE TO authenticated
  USING (public.portal_can('contacts'::text, 'delete'::text) AND public.portal_contact_ok(id, account_id));

-- ---------------------------------------------------------------------------
-- 5) RLS — accounts & partners: hide soft-deleted rows unless Trash access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portal_select ON public.accounts;
CREATE POLICY portal_select ON public.accounts
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['dashboard','reports','documents','accounts','contacts','partners','contractors','engagements','activities','pipeline','finance_dashboard','finance_tracker','invoices','expenses','payments','pnl','innovation_portfolio','innovation_maturity','vendor_inquiries','vendor_applications','events','client_intake','trash'])
    AND public.portal_account_ok(id)
    AND (deleted_at IS NULL OR public.portal_can('trash'::text, 'view'::text))
  );

DROP POLICY IF EXISTS portal_select ON public.partners;
CREATE POLICY portal_select ON public.partners
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['partners','engagements','pipeline','vendor_applications','events','documents','reports','accounts','trash'])
    AND (deleted_at IS NULL OR public.portal_can('trash'::text, 'view'::text))
  );

DROP POLICY IF EXISTS portal_vem_select ON public.partners;
CREATE POLICY portal_vem_select ON public.partners
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['client_intake','vendor_inquiries','innovation_exchange'])
    AND deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- 6) Register Trash module permissions for existing seats (owner/admin: full)
-- ---------------------------------------------------------------------------
INSERT INTO public.user_permissions (user_id, module_key, can_view, can_create, can_edit, can_delete)
SELECT u.id, 'trash', true, false, true, true
FROM public.portal_users u
WHERE u.seat_role IN ('owner', 'admin')
ON CONFLICT (user_id, module_key) DO UPDATE
  SET can_view = EXCLUDED.can_view,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete;
