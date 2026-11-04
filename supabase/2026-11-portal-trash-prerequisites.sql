-- =============================================================================
-- RUN THIS BEFORE 2026-11-portal-trash.sql if you see:
--   function public.portal_can(unknown, unknown) does not exist
--
-- These helpers normally come from 2026-10-phase2-google-auth-rls.sql.
-- This file installs only the functions Recently Deleted policies need.
-- Safe to re-run (CREATE OR REPLACE).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.portal_me_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users u
    WHERE u.id = public.portal_me_id() AND u.seat_role IN ('owner', 'admin')
  )
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
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions p
       WHERE p.user_id = public.portal_me_id() AND p.module_key = ANY (p_modules) AND p.can_view
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.portal_all_records() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_is_admin()
      OR EXISTS (
        SELECT 1 FROM public.portal_users u
        WHERE u.id = public.portal_me_id() AND u.scope_mode = 'all'
      )
$$;

CREATE OR REPLACE FUNCTION public.portal_account_ok(p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR (
        p_account IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_account_scopes s
          WHERE s.user_id = public.portal_me_id() AND s.account_id = p_account
        )
      )
$$;

CREATE OR REPLACE FUNCTION public.portal_contact_ok(p_contact uuid, p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.portal_all_records()
      OR (p_account IS NOT NULL AND public.portal_account_ok(p_account))
      OR EXISTS (
        SELECT 1 FROM public.account_contacts ac
        WHERE ac.contact_id = p_contact AND public.portal_account_ok(ac.account_id)
      )
$$;

GRANT EXECUTE ON FUNCTION
  public.portal_me_id(),
  public.portal_is_admin(),
  public.portal_can(text, text),
  public.portal_can_view_any(text[]),
  public.portal_all_records(),
  public.portal_account_ok(uuid),
  public.portal_contact_ok(uuid, uuid)
TO authenticated;
