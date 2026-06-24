-- Admin user creation without public signup (avoids session switch on auth.signUp).

CREATE OR REPLACE FUNCTION public.create_user(
  p_email text,
  p_password text,
  p_display_name text,
  p_organization_id uuid,
  p_is_active boolean DEFAULT true,
  p_must_change_password boolean DEFAULT false,
  p_role_names text[] DEFAULT ARRAY['user']::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, administration
AS $$
DECLARE
  v_caller_org uuid;
  v_org_id uuid;
  v_user_id uuid;
  v_role_name text;
  v_role_id uuid;
BEGIN
  IF NOT (administration.is_super_admin() OR administration.is_organization_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_caller_org := administration.current_organization_id();
  v_org_id := p_organization_id;

  IF administration.is_organization_admin() AND NOT administration.is_super_admin() THEN
    v_org_id := v_caller_org;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  v_user_id := gen_random_uuid();

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
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'display_name', p_display_name,
      'organization_id', v_org_id
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

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
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  );

  UPDATE administration.user
  SET
    display_name = p_display_name,
    organization_id = v_org_id,
    is_active = p_is_active,
    must_change_password = p_must_change_password
  WHERE uid = v_user_id;

  DELETE FROM administration.user_role WHERE uid = v_user_id;

  FOR v_role_name IN SELECT unnest(p_role_names)
  LOOP
    SELECT id INTO v_role_id FROM administration.role WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO administration.user_role (uid, role_id) VALUES (v_user_id, v_role_id);
    END IF;
  END LOOP;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user(
  text, text, text, uuid, boolean, boolean, text[]
) TO authenticated;
