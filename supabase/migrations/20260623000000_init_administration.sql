-- ==========================================
-- SCHEMA & EXTENSIONS
-- ==========================================

CREATE SCHEMA IF NOT EXISTS administration;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Organizations (tenants)
CREATE TABLE administration.organization (
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
  organization_id      UUID NOT NULL REFERENCES administration.organization(id) ON DELETE RESTRICT,
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

-- 5. Groups (per organization)
CREATE TABLE administration.group (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- 6. User ↔ Group
CREATE TABLE administration.user_group (
  uid      UUID NOT NULL REFERENCES administration.user(uid) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES administration.group(id) ON DELETE CASCADE,
  PRIMARY KEY (uid, group_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_user_organization ON administration.user (organization_id);
CREATE INDEX idx_group_organization ON administration.group (organization_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE administration.organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user         ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.role         ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user_role    ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.group        ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration.user_group   ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER tr_organization_updated BEFORE UPDATE ON administration.organization FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_user_updated         BEFORE UPDATE ON administration.user         FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_role_updated         BEFORE UPDATE ON administration.role         FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();
CREATE TRIGGER tr_group_updated        BEFORE UPDATE ON administration.group        FOR EACH ROW EXECUTE FUNCTION administration.set_updated_at();

-- ==========================================
-- SECURITY HELPER FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION administration.current_organization_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$ SELECT organization_id FROM administration.user WHERE uid = auth.uid() $$;

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

CREATE OR REPLACE FUNCTION administration.is_organization_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = administration, public
AS $$ SELECT administration.has_role('organization_admin') $$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- ---- organization ----
CREATE POLICY organization_select ON administration.organization
  FOR SELECT USING (
    administration.is_super_admin()
    OR id = administration.current_organization_id()
  );

CREATE POLICY organization_manage ON administration.organization
  FOR ALL USING (administration.is_super_admin());

-- ---- user ----
CREATE POLICY user_select ON administration.user
  FOR SELECT USING (
    auth.uid() = uid
    OR (
      (administration.is_super_admin() OR administration.is_organization_admin())
      AND organization_id = administration.current_organization_id()
    )
  );

CREATE POLICY user_insert ON administration.user
  FOR INSERT WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

CREATE POLICY user_update ON administration.user
  FOR UPDATE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.is_super_admin()
    OR (
      administration.is_organization_admin()
      AND organization_id = administration.current_organization_id()
    )
  );

CREATE POLICY user_delete ON administration.user
  FOR DELETE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
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
    OR (
      (administration.is_super_admin() OR administration.is_organization_admin())
      AND uid IN (
        SELECT u.uid FROM administration.user u
        WHERE u.organization_id = administration.current_organization_id()
      )
    )
  );

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

CREATE POLICY user_role_update ON administration.user_role
  FOR UPDATE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND uid IN (
      SELECT u.uid FROM administration.user u
      WHERE u.organization_id = administration.current_organization_id()
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

CREATE POLICY user_role_delete ON administration.user_role
  FOR DELETE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND uid IN (
      SELECT u.uid FROM administration.user u
      WHERE u.organization_id = administration.current_organization_id()
    )
  );

-- ---- group (scoped by organization) ----
CREATE POLICY group_select ON administration.group
  FOR SELECT USING (
    organization_id = administration.current_organization_id()
  );

CREATE POLICY group_insert ON administration.group
  FOR INSERT WITH CHECK (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
  );

CREATE POLICY group_update ON administration.group
  FOR UPDATE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
  );

CREATE POLICY group_delete ON administration.group
  FOR DELETE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND organization_id = administration.current_organization_id()
  );

-- ---- user_group ----
CREATE POLICY user_group_select ON administration.user_group
  FOR SELECT USING (
    auth.uid() = uid
    OR EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.organization_id = administration.current_organization_id()
      AND (administration.is_super_admin() OR administration.is_organization_admin())
    )
  );

CREATE POLICY user_group_insert ON administration.user_group
  FOR INSERT WITH CHECK (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.organization_id = administration.current_organization_id()
    )
  );

CREATE POLICY user_group_update ON administration.user_group
  FOR UPDATE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.organization_id = administration.current_organization_id()
    )
  )
  WITH CHECK (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.organization_id = administration.current_organization_id()
    )
  );

CREATE POLICY user_group_delete ON administration.user_group
  FOR DELETE USING (
    (administration.is_super_admin() OR administration.is_organization_admin())
    AND EXISTS (
      SELECT 1 FROM administration.group g
      WHERE g.id = group_id AND g.organization_id = administration.current_organization_id()
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
  INSERT INTO administration.user (uid, email, display_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data ->> 'organization_id')::uuid
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

CREATE OR REPLACE VIEW public.organizations WITH (security_invoker = true) AS
  SELECT id, name, slug, is_active, created_at, updated_at
  FROM administration.organization;

CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
  SELECT uid, email, display_name, avatar_url, organization_id, is_active, must_change_password, created_at, updated_at
  FROM administration.user;

CREATE OR REPLACE VIEW public.roles WITH (security_invoker = true) AS
  SELECT id, name, description, created_at, updated_at
  FROM administration.role;

CREATE OR REPLACE VIEW public.user_roles WITH (security_invoker = true) AS
  SELECT uid, role_id
  FROM administration.user_role;

CREATE OR REPLACE VIEW public.groups WITH (security_invoker = true) AS
  SELECT id, organization_id, name, description, created_at, updated_at
  FROM administration.group;

CREATE OR REPLACE VIEW public.user_groups WITH (security_invoker = true) AS
  SELECT uid, group_id
  FROM administration.user_group;

-- ==========================================
-- SEED DATA
-- ==========================================

INSERT INTO administration.role (name, description) VALUES
  ('super_admin',        'Platform administrator — manages organizations; data scoped to own organization'),
  ('organization_admin', 'Organization administrator — manages users, groups, and settings within their organization'),
  ('user',               'Standard user')
ON CONFLICT (name) DO NOTHING;
