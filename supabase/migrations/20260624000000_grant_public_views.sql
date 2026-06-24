-- PostgREST exposes public views; grant SELECT so authenticated clients can query them.
-- RLS on underlying administration.* tables still applies (security_invoker views).

GRANT SELECT ON public.clients TO authenticated, service_role;
GRANT SELECT ON public.users TO authenticated, service_role;
GRANT SELECT ON public.roles TO authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated, service_role;
GRANT SELECT ON public.privileges TO authenticated, service_role;
GRANT SELECT ON public.role_privileges TO authenticated, service_role;
GRANT SELECT ON public.groups TO authenticated, service_role;
GRANT SELECT ON public.user_groups TO authenticated, service_role;
