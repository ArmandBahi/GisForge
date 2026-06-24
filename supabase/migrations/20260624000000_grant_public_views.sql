-- PostgREST exposes public views; grant SELECT so authenticated clients can query them.
-- RLS on underlying administration.* tables still applies (security_invoker views).

GRANT SELECT ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.users TO authenticated, service_role;
GRANT SELECT ON public.roles TO authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated, service_role;
GRANT SELECT ON public.groups TO authenticated, service_role;
GRANT SELECT ON public.user_groups TO authenticated, service_role;
