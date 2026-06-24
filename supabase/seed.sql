-- Default organization and super-admin for local development

INSERT INTO administration.organization (name, slug)
VALUES ('Default', 'default')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_super_admin_role_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM administration.organization WHERE slug = 'default';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Default organization not found';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'admin@default.local',
    extensions.crypt('123456', extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('display_name', 'admin', 'organization_id', v_org_id),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@default.local'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  )
  ON CONFLICT DO NOTHING;

  UPDATE administration.user
  SET
    display_name = 'admin',
    organization_id = v_org_id,
    is_active = true,
    must_change_password = false
  WHERE uid = v_user_id;

  SELECT id INTO v_super_admin_role_id FROM administration.role WHERE name = 'super_admin';

  IF v_super_admin_role_id IS NOT NULL THEN
    DELETE FROM administration.user_role WHERE uid = v_user_id;
    INSERT INTO administration.user_role (uid, role_id) VALUES (v_user_id, v_super_admin_role_id);
  END IF;
END $$;
