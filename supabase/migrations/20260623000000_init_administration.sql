-- ==========================================
-- SCHEMA & EXTENSIONS
-- ==========================================

CREATE SCHEMA IF NOT EXISTS administration;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Clients (tenants)
CREATE TABLE administration.client (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Users (extends auth.users)
CREATE TABLE administration.user (
  uid                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  display_name         TEXT,
  avatar_url           TEXT,
  client_id            UUID REFERENCES administration.client(id) ON DELETE SET NULL,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Roles
CREATE TABLE administration.role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User ↔ Role
CREATE TABLE administration.user_role (
  uid     UUID NOT NULL REFERENCES administration.user(uid) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES administration.role(id) ON DELETE CASCADE,
  PRIMARY KEY (uid, role_id)
);

-- 5. Privileges
CREATE TABLE administration.privilege (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Role ↔ Privilege
CREATE TABLE administration.role_privilege (
  role_id      UUID NOT NULL REFERENCES administration.role(id) ON DELETE CASCADE,
  privilege_id UUID NOT NULL REFERENCES administration.privilege(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, privilege_id)
);

-- 7. Groups (per client)
CREATE TABLE administration.group (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES administration.client(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

-- 8. User ↔ Group
CREATE TABLE administration.user_group (
  uid      UUID NOT NULL REFERENCES administration.user(uid) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES administration.group(id) ON DELETE CASCADE,
  PRIMARY KEY (uid, group_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_user_client ON administration.user (client_id);
CREATE INDEX idx_group_client ON administration.group (client_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE administration.client         ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user           ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.role           ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user_role      ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.privilege      ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.role_privilege ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.group          ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user_group     ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TRIGGER: updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION administration.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_client_updated    BEFORE UPDATE ON administration.client    FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_user_updated      BEFORE UPDATE ON administration.user      FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_role_updated      BEFORE UPDATE ON administration.role      FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_privilege_updated BEFORE UPDATE ON administration.privilege FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_group_updated     BEFORE UPDATE ON administration.group     FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();

-- ==========================================
-- SECURITY HELPER FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION administration.current_client_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$ SELECT client_id FROM administration.user WHERE uid = auth.uid() $$;

CREATE OR REPLACE FUNCTION administration.has_role(_role text)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM administration.user_role ur
    JOIN administration.role r ON ur.role_id = r.id
    WHERE ur.uid = auth.uid() AND r.name = _role
  )
$$;

CREATE OR REPLACE FUNCTION administration.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$ SELECT administration.has_role('super_admin') $$;

CREATE OR REPLACE FUNCTION administration.has_privilege(_privilege text)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$
BEGIN
  IF administration.is_super_admin() THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM administration.user_role ur
    JOIN administration.role_privilege rp ON ur.role_id = rp.role_id
    JOIN administration.privilege p ON rp.privilege_id = p.id
    WHERE ur.uid = auth.uid() AND p.name = _privilege
  );
END;
$$;

CREATE OR REPLACE FUNCTION administration.has_any_privilege(_privileges text[])
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$
BEGIN
  IF administration.is_super_admin() THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM administration.user_role ur
    JOIN administration.role_privilege rp ON ur.role_id = rp.role_id
    JOIN administration.privilege p ON rp.privilege_id = p.id
    WHERE ur.uid = auth.uid() AND p.name = ANY(_privileges)
  );
END;
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- ---- client ----
CREATE POLICY client_select ON administration.client
  FOR SELECT USING (
    administration.is_super_admin()
    OR id = administration.current_client_id()
  );

CREATE POLICY client_manage ON administration.client
  FOR ALL USING (administration.is_super_admin());

-- ---- user ----
CREATE POLICY user_select ON administration.user
  FOR SELECT USING (
    auth.uid() = uid
    OR administration.is_super_admin()
    OR (administration.has_privilege('users_manage') AND client_id = administration.current_client_id())
  );

CREATE POLICY user_manage ON administration.user
  FOR ALL USING (
    administration.is_super_admin()
    OR (administration.has_privilege('users_manage') AND client_id = administration.current_client_id())
  );

-- ---- role (reference data) ----
CREATE POLICY role_select ON administration.role
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY role_manage ON administration.role
  FOR ALL USING (administration.is_super_admin());

-- ---- user_role ----
CREATE POLICY user_role_select ON administration.user_role
  FOR SELECT USING (
    auth.uid() = uid
    OR administration.is_super_admin()
    OR (
      administration.has_privilege('users_manage')
      AND uid IN (SELECT u.uid FROM administration.user u WHERE u.client_id = administration.current_client_id())
    )
  );

CREATE POLICY user_role_manage ON administration.user_role
  FOR ALL USING (
    administration.is_super_admin()
    OR (
      administration.has_privilege('users_manage')
      AND uid IN (SELECT u.uid FROM administration.user u WHERE u.client_id = administration.current_client_id())
    )
  );

-- ---- privilege (reference data) ----
CREATE POLICY privilege_select ON administration.privilege
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY privilege_manage ON administration.privilege
  FOR ALL USING (administration.is_super_admin());

-- ---- role_privilege (reference data) ----
CREATE POLICY role_privilege_select ON administration.role_privilege
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY role_privilege_manage ON administration.role_privilege
  FOR ALL USING (administration.is_super_admin());

-- ---- group (scoped by client) ----
CREATE POLICY group_select ON administration.group
  FOR SELECT USING (
    administration.is_super_admin()
    OR client_id = administration.current_client_id()
  );

CREATE POLICY group_manage ON administration.group
  FOR ALL USING (
    administration.is_super_admin()
    OR (administration.has_privilege('groups_manage') AND client_id = administration.current_client_id())
  );

-- ---- user_group ----
CREATE POLICY user_group_select ON administration.user_group
  FOR SELECT USING (
    auth.uid() = uid
    OR administration.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.client_id = administration.current_client_id()
    )
  );

CREATE POLICY user_group_manage ON administration.user_group
  FOR ALL USING (
    administration.is_super_admin()
    OR (
      administration.has_privilege('groups_manage')
      AND EXISTS (
        SELECT 1 FROM administration.group g
        WHERE g.id = group_id AND g.client_id = administration.current_client_id()
      )
    )
  );

-- ==========================================
-- TRIGGER: auto-create user on auth signup
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_default_role_id UUID;
BEGIN
  INSERT INTO administration.user (uid, email, display_name, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data ->> 'client_id')::uuid
  );

  SELECT id INTO v_default_role_id FROM administration.role WHERE name = 'user';

  IF v_default_role_id IS NOT NULL THEN
    INSERT INTO administration.user_role (uid, role_id) VALUES (NEW.id, v_default_role_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- GRANTS (for PostgREST / Supabase client)
-- ==========================================

GRANT USAGE ON SCHEMA administration TO authenticated;
GRANT ALL   ON ALL TABLES IN SCHEMA administration TO authenticated;

-- ==========================================
-- PUBLIC VIEWS (security_invoker = RLS respected)
-- ==========================================

CREATE OR REPLACE VIEW public.clients WITH (security_invoker = true) AS
  SELECT id, name, slug, is_active, created_at, updated_at
  FROM administration.client;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
  SELECT uid, email, display_name, avatar_url, client_id, is_active, must_change_password, created_at, updated_at
  FROM administration.user;

CREATE OR REPLACE VIEW public.roles WITH (security_invoker = true) AS
  SELECT id, name, description, created_at, updated_at
  FROM administration.role;

CREATE OR REPLACE VIEW public.user_roles WITH (security_invoker = true) AS
  SELECT uid, role_id
  FROM administration.user_role;

CREATE OR REPLACE VIEW public.privileges WITH (security_invoker = true) AS
  SELECT id, name, description, created_at, updated_at
  FROM administration.privilege;

CREATE OR REPLACE VIEW public.role_privileges WITH (security_invoker = true) AS
  SELECT role_id, privilege_id
  FROM administration.role_privilege;

CREATE OR REPLACE VIEW public.groups WITH (security_invoker = true) AS
  SELECT id, client_id, name, description, created_at, updated_at
  FROM administration.group;

CREATE OR REPLACE VIEW public.user_groups WITH (security_invoker = true) AS
  SELECT uid, group_id
  FROM administration.user_group;

-- ==========================================
-- SEED DATA
-- ==========================================

INSERT INTO administration.role (name, description) VALUES
  ('super_admin',  'Platform administrator — full access, bypasses all privilege checks'),
  ('admin_client', 'Client administrator — manages users, groups, and settings within their organization'),
  ('user',         'Standard user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO administration.privilege (name, description) VALUES
  ('users_manage',  'Manage users and role assignments within own client'),
  ('groups_manage', 'Manage groups and group memberships within own client')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_admin_client_id UUID;
  v_users_manage_id UUID;
  v_groups_manage_id UUID;
BEGIN
  SELECT id INTO v_admin_client_id FROM administration.role      WHERE name = 'admin_client';
  SELECT id INTO v_users_manage_id FROM administration.privilege  WHERE name = 'users_manage';
  SELECT id INTO v_groups_manage_id FROM administration.privilege WHERE name = 'groups_manage';

  IF v_admin_client_id IS NOT NULL THEN
    INSERT INTO administration.role_privilege (role_id, privilege_id) VALUES
      (v_admin_client_id, v_users_manage_id),
      (v_admin_client_id, v_groups_manage_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
