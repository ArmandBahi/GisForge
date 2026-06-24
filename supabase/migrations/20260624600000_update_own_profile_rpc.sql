-- Self-service profile updates (display name + password change flag).

CREATE OR REPLACE FUNCTION public.update_own_profile(p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, administration
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE administration.user
  SET display_name = p_display_name
  WHERE uid = auth.uid();

  UPDATE auth.users
  SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('display_name', p_display_name),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, administration
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE administration.user
  SET must_change_password = false
  WHERE uid = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
