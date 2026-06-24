-- Admin user deletion (removes auth.users; administration.user cascades via FK).

CREATE OR REPLACE FUNCTION public.delete_user(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, administration
AS $$
DECLARE
  v_caller_org uuid;
  v_user_org uuid;
BEGIN
  IF NOT (administration.is_super_admin() OR administration.is_organization_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF auth.uid() = p_uid THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  v_caller_org := administration.current_organization_id();

  SELECT organization_id INTO v_user_org
  FROM administration.user
  WHERE uid = p_uid;

  IF v_user_org IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_org <> v_caller_org THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;
