# App schema

Business tables live in the `app` schema. Each table should be org-scoped via `organization_id`.

When adding a new business domain, create a migration following [supabase-conventions.md](../ai/supabase-conventions.md).

1. Table in `app` schema with `organization_id` FK
2. RLS policies using `administration.current_organization_id()` and role helpers
3. `public.*` view with `security_invoker = true`
4. GRANT on the public view

Document new tables in this file.
