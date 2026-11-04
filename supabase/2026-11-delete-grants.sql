-- =============================================================================
-- Delete permission policy
--
-- • Only Owner/Admin seats can delete records (portal_is_admin in portal_can).
-- • Team members need an explicit can_delete on a module.
-- • Only Tony / Azaiah (owner seat or their sign-in emails) can SET can_delete
--   on user_permissions — enforced in the database, not just the UI.
--
-- Run in Supabase SQL Editor after seats/permissions migrations.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.portal_can_grant_delete() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users u
    WHERE u.id = public.portal_me_id()
      AND u.status = 'active'
      AND (
        u.seat_role = 'owner'
        OR lower(trim(coalesce(u.email, ''))) IN ('tony@dataisdata.com', 'azaiah@dataisdata.com')
      )
  )
$$;

REVOKE ALL ON FUNCTION public.portal_can_grant_delete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_can_grant_delete() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_permissions_guard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.can_delete IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF public.portal_can_grant_delete() THEN
    RETURN NEW;
  END IF;

  -- Non-grantors cannot turn delete on; they may keep an existing delete grant when saving other fields.
  IF TG_OP = 'UPDATE' AND OLD.can_delete IS TRUE THEN
    NEW.can_delete := true;
    RETURN NEW;
  END IF;

  NEW.can_delete := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_permissions_guard_delete ON public.user_permissions;
CREATE TRIGGER user_permissions_guard_delete
  BEFORE INSERT OR UPDATE OF can_delete ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.user_permissions_guard_delete();

-- Clear delete flags for every non–Owner/Admin seat (one-time hygiene).
UPDATE public.user_permissions p
SET can_delete = false
FROM public.portal_users u
WHERE u.id = p.user_id
  AND u.seat_role NOT IN ('owner', 'admin')
  AND p.can_delete = true;
