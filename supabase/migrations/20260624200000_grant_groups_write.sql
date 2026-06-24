-- Allow authenticated clients to mutate groups through public views (RLS on underlying tables applies).

GRANT INSERT, UPDATE, DELETE ON public.groups TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.user_groups TO authenticated, service_role;
