-- =============================================================================
-- Recently Deleted — work & finance tables (run after 2026-11-portal-trash.sql)
-- Adds soft-delete columns so restore syncs records back into lists automatically.
-- =============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contractors',
    'engagements',
    'opportunities',
    'activities',
    'expenses',
    'invoices'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.portal_users(id) ON DELETE SET NULL',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON public.%I (deleted_at) WHERE deleted_at IS NOT NULL',
      t, t
    );
  END LOOP;
END $$;

-- Allow trash snapshots when an admin soft-deletes (portal_is_admin already bypasses module checks).
