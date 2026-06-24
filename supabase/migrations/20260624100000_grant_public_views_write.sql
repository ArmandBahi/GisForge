-- Allow authenticated clients to mutate through public views (RLS on underlying tables applies).

GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, service_role;
