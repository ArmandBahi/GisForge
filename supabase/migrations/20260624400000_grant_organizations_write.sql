-- Allow authenticated clients to mutate organizations through public views (RLS on underlying tables applies).

GRANT INSERT, UPDATE, DELETE ON public.organizations TO authenticated, service_role;
