-- super_admin: accès global aux utilisateurs et à leurs rôles (lecture + mutation).
-- organization_admin: reste scopé à sa propre organisation.

-- ---- user ----
DROP POLICY IF EXISTS user_select ON administration.user;
CREATE POLICY user_select ON administration.user
  FOR SELECT USING (
    auth.uid() = uid
    OR administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

DROP POLICY IF EXISTS user_insert ON administration.user;
CREATE POLICY user_insert ON administration.user
  FOR INSERT WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

DROP POLICY IF EXISTS user_update ON administration.user;
CREATE POLICY user_update ON administration.user
  FOR UPDATE USING (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  )
  WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

DROP POLICY IF EXISTS user_delete ON administration.user;
CREATE POLICY user_delete ON administration.user
  FOR DELETE USING (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

-- ---- user_role ----
DROP POLICY IF EXISTS user_role_select ON administration.user_role;
CREATE POLICY user_role_select ON administration.user_role
  FOR SELECT USING (
    auth.uid() = uid
    OR administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS user_role_insert ON administration.user_role;
CREATE POLICY user_role_insert ON administration.user_role
  FOR INSERT WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS user_role_update ON administration.user_role;
CREATE POLICY user_role_update ON administration.user_role
  FOR UPDATE USING (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  )
  WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS user_role_delete ON administration.user_role;
CREATE POLICY user_role_delete ON administration.user_role
  FOR DELETE USING (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  );

-- RPC: super_admin peut gérer les utilisateurs de toutes les organisations.
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

  IF NOT administration.is_super_admin() AND v_user_org <> v_caller_org THEN
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

  IF NOT administration.is_super_admin() AND v_user_org <> v_caller_org THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;
