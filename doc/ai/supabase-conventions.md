# Supabase conventions

## Migrations

- Location: `supabase/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.sql` (timestamp prefix)
- Apply: `npx supabase db reset` (full reset + seed) or `npx supabase migration up`
- After any migration: `npm run gen:types`

## Schema organization

- `administration` — multi-tenant core (organizations, users, roles, groups)
- Business tables: use a dedicated schema or extend as needed
- Always expose client tables via `public.*` views

## Public views pattern

```sql
CREATE VIEW public.products
  WITH (security_invoker = true)
  AS SELECT * FROM app.product;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
```

`security_invoker = true` means RLS on the underlying table applies to the caller.

## RLS for org-scoped tables

```sql
ALTER TABLE app.product ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_select ON app.product
  FOR SELECT TO authenticated
  USING (
    organization_id = administration.current_organization_id()
    OR administration.is_super_admin()
  );

CREATE POLICY product_insert ON app.product
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND (administration.is_organization_admin() OR administration.is_super_admin())
  );
```

Helper functions (in `administration` schema):
- `administration.current_organization_id()` — caller's org
- `administration.has_role(_role)` — role check
- `administration.is_super_admin()` — super_admin shortcut
- `administration.is_organization_admin()` — organization_admin shortcut

## RPC functions (SECURITY DEFINER)

Use when admin operations must bypass or cross RLS:

| RPC | Purpose |
|-----|---------|
| `create_user(...)` | Admin user creation (signup disabled) |
| `delete_user(p_uid)` | Admin user deletion |
| `update_user_roles(p_uid, p_role_names)` | Atomic role update |
| `update_own_profile(p_display_name)` | Self profile update |
| `clear_must_change_password()` | Reset password change flag |

Pattern:

```sql
CREATE OR REPLACE FUNCTION public.my_rpc(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, administration
AS $$
BEGIN
  -- authorization check
  IF NOT public.is_organization_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- operation
END;
$$;
```

## Seed

- File: `supabase/seed.sql`
- Runs automatically on `db reset` (see `[db.seed]` in `config.toml`)
- Creates default organization + super_admin (`admin@default.local` / `123456`)

## Auth configuration

- Public signup disabled: `enable_signup = false` in `config.toml`
- Users created by admins via `create_user` RPC

## TypeScript types

Generated file: `src/app/core/supabase/database.types.ts`

```bash
npm run gen:types
# or with local stack check:
npm run gen:types:check
```

Never edit this file manually.

## Client usage

Services query `public` views via the Supabase client:

```typescript
this.supabase.from('users').select('*')
this.supabase.rpc('create_user', { p_email: '...', ... })
```

Never use the `administration` schema directly from the client.
