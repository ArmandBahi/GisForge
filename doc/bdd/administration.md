# Administration schema

> Multi-tenant: every user belongs to an **organization** (required).  
> `organization_admin` sees and manages only users and groups in their organization.  
> `super_admin` sees **all** users (all organizations) and can reassign a user's organization.

---

## Tables

### `administration.organization`

Tenant / organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE NOT NULL — URL-friendly identifier |
| `is_active` | `boolean` | default `true` |
| `created_at`, `updated_at` | `timestamptz` | |

### `administration.user`

Application profile linked to `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `uid` | `uuid` | PK → `auth.users(id)` CASCADE |
| `email` | `text` | NOT NULL |
| `display_name` | `text` | |
| `avatar_url` | `text` | |
| `organization_id` | `uuid` | FK → `organization(id)` RESTRICT, NOT NULL |
| `is_active` | `boolean` | default `true` |
| `must_change_password` | `boolean` | default `false` — if `true`, user is redirected to `/my-profile` until password change |
| `created_at`, `updated_at` | `timestamptz` | |

**Trigger**: `set_updated_at()` on UPDATE.

### `administration.role`

Application roles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | UNIQUE NOT NULL |
| `description` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

**Default roles**: `super_admin`, `organization_admin`, `user`.

### `administration.user_role`

User ↔ role association (N-N).

| Column | Type | Notes |
|--------|------|-------|
| `uid` | `uuid` | FK → `user(uid)` CASCADE |
| `role_id` | `uuid` | FK → `role(id)` CASCADE |

Composite PK `(uid, role_id)`.

### `administration.group`

User groups, scoped by organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `organization_id` | `uuid` | FK → `organization(id)` CASCADE, NOT NULL |
| `name` | `text` | NOT NULL, UNIQUE per org `(organization_id, name)` |
| `description` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

### `administration.user_group`

User ↔ group association (N-N).

| Column | Type | Notes |
|--------|------|-------|
| `uid` | `uuid` | FK → `user(uid)` CASCADE |
| `group_id` | `uuid` | FK → `group(id)` CASCADE |

Composite PK `(uid, group_id)`.

---

## Security functions (SECURITY DEFINER)

| Function | Role |
|----------|------|
| `current_organization_id()` | Returns current user's `organization_id` |
| `has_role(_role)` | Checks if current user has a given role |
| `is_super_admin()` | Shortcut for `has_role('super_admin')` |
| `is_organization_admin()` | Shortcut for `has_role('organization_admin')` |
| `create_user(...)` | Admin user creation (RPC, public signup disabled) |
| `delete_user(p_uid)` | Admin user deletion (RPC, deletes `auth.users`) |
| `update_user_roles(p_uid, p_role_names)` | Atomic role update (RPC, avoids RLS failure on self-edit) |
| `update_own_profile(p_display_name)` | Display name update by current user |
| `clear_must_change_password()` | Resets flag after password change |

---

## RLS scoping rules

| Table | SELECT | INSERT / UPDATE / DELETE |
|-------|--------|--------------------------|
| `organization` | Own org OR super_admin (all) | super_admin only (global CRUD) |
| `user` | Self, OR all users (super_admin), OR org users (organization_admin) | super_admin global; organization_admin org-scoped |
| `role` | Any authenticated user | super_admin only |
| `user_role` | Own roles, OR all (super_admin), OR org users (organization_admin) | super_admin global; organization_admin org-scoped |
| `group` | Org groups | Admin org-scoped |
| `user_group` | Own groups, OR org groups (admin) | Admin org-scoped |

---

## Auth trigger

`handle_new_user()` — triggered on `INSERT` into `auth.users`:

1. Creates row in `administration.user` with `email`, `display_name` (from metadata or email local part)
2. Reads `organization_id` from `raw_user_meta_data->>'organization_id'` (passed on invitation)
3. Assigns default `user` role

---

## Public views

All tables exposed via views in `public` schema with `security_invoker = true` (underlying RLS applies):

`organizations`, `users`, `roles`, `user_roles`, `groups`, `user_groups`

---

## Migration

Initial schema: `supabase/migrations/20260623000000_init_administration.sql`
