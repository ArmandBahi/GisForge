-- Atomic role updates (avoids RLS failure when editing own roles: delete-all then insert).

CREATE OR REPLACE FUNCTION public.update_user_roles(
  p_uid uuid,
  p_role_names text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, administration
AS $$
DECLARE
  v_caller_org uuid;
  v_user_org uuid;
  v_role_name text;
  v_role_id uuid;
BEGIN
  IF NOT (administration.is_super_admin() OR administration.is_organization_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_role_names IS NULL OR array_length(p_role_names, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one role is required';
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

  IF administration.is_organization_admin() AND NOT administration.is_super_admin() THEN
    IF 'super_admin' = ANY (p_role_names) THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  DELETE FROM administration.user_role WHERE uid = p_uid;

  FOR v_role_name IN SELECT unnest(p_role_names)
  LOOP
    SELECT id INTO v_role_id FROM administration.role WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO administration.user_role (uid, role_id) VALUES (p_uid, v_role_id);
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_roles(uuid, text[]) TO authenticated;
