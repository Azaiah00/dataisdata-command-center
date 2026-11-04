-- =============================================================================
-- Portal Trash — accounts & partners (run AFTER 2026-11-portal-trash.sql if you
-- already applied the contacts-only version)
-- =============================================================================

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

DROP POLICY IF EXISTS portal_trash_insert ON public.portal_trash;
CREATE POLICY portal_trash_insert ON public.portal_trash
  FOR INSERT TO authenticated
  WITH CHECK (
    public.portal_is_admin()
    OR public.portal_can('contacts', 'delete')
    OR public.portal_can('accounts', 'delete')
    OR public.portal_can('partners', 'delete')
  );

DROP POLICY IF EXISTS portal_select ON public.accounts;
CREATE POLICY portal_select ON public.accounts
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['dashboard','reports','documents','accounts','contacts','partners','contractors','engagements','activities','pipeline','finance_dashboard','finance_tracker','invoices','expenses','payments','pnl','innovation_portfolio','innovation_maturity','vendor_inquiries','vendor_applications','events','client_intake','trash'])
    AND public.portal_account_ok(id)
    AND (deleted_at IS NULL OR public.portal_can('trash', 'view'))
  );

DROP POLICY IF EXISTS portal_select ON public.partners;
CREATE POLICY portal_select ON public.partners
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['partners','engagements','pipeline','vendor_applications','events','documents','reports','accounts','trash'])
    AND (deleted_at IS NULL OR public.portal_can('trash', 'view'))
  );

DROP POLICY IF EXISTS portal_vem_select ON public.partners;
CREATE POLICY portal_vem_select ON public.partners
  FOR SELECT TO authenticated
  USING (
    public.portal_can_view_any(ARRAY['client_intake','vendor_inquiries','innovation_exchange'])
    AND deleted_at IS NULL
  );
