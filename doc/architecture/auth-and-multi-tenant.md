# Auth and multi-tenant architecture

## Overview

GisForge uses Supabase Auth for authentication and Postgres RLS for authorization. Every user belongs to exactly one organization.

## Roles

| Role | Scope |
|------|-------|
| `user` | Standard user, read access within own org |
| `organization_admin` | Manage users and groups in own organization |
| `super_admin` | Global user visibility, CRUD all organizations |

## AuthService (`core/auth/auth.service.ts`)

Central session and profile management using signals:

| Signal / computed | Purpose |
|-------------------|---------|
| `session()` | Supabase auth session |
| `user()` | Supabase auth user |
| `userProfile()` | `administration.user` row |
| `roles()` | Array of role names |
| `organizationActive()` | Whether user's org `is_active` |
| `isAuthenticated()` | Has valid session |
| `canAccessApp()` | Authenticated + active org |
| `mustChangePassword()` | Forced password change flag |
| `currentOrganizationId()` | User's org ID |

Key methods:
- `whenReady()` — await initial auth state (used by guards)
- `hasRole(role)` — check role
- `signIn()`, `signOut()`, `refreshProfile()`

## Guards (`core/auth/auth.guard.ts`)

| Guard | Purpose |
|-------|---------|
| `authGuard` | Requires session + active organization |
| `guestGuard` | Redirects authenticated users away from login |
| `roleGuard([roles])` | Requires one of the specified roles |
| `passwordChangeChildGuard` | Redirects to `/my-profile` if `must_change_password` |

Applied in `app.routes.ts`:

```typescript
{
  path: '',
  canActivate: [authGuard],
  canActivateChild: [passwordChangeChildGuard],
  loadComponent: () => import('./core/layout/app-layout.component'),
  children: [ /* features */ ],
}
```

## Organization scoping

### Database (RLS)

- Business data tables include `organization_id`
- Policies use `public.current_organization_id()` and role helpers
- `super_admin` policies often allow global access where needed

### Frontend

- Services filter by `authService.currentOrganizationId()` when not super_admin
- `super_admin` can see all users and change user organizations
- `organization_admin` is limited to own org

## Access restrictions

| Condition | Behavior |
|-----------|----------|
| Not authenticated | Redirect to `/login` |
| Organization inactive | Sign out, redirect to login with error |
| `must_change_password` | Only `/my-profile` accessible |
| Missing role | Redirect to dashboard |

## User provisioning

Public signup is disabled. Admins create users via RPC:

```typescript
await supabase.rpc('create_user', {
  p_email: '...',
  p_password: '...',
  p_display_name: '...',
  p_organization_id: '...',
  p_role_names: ['user'],
});
```

## Self-service profile

- `update_own_profile(p_display_name)` — RPC for display name
- Password change via `supabase.auth.updateUser({ password })`
- `clear_must_change_password()` — RPC after password change

## Seed account

After `supabase db reset`:

| Field | Value |
|-------|-------|
| Email | `admin@default.local` |
| Password | `123456` |
| Role | `super_admin` |
| Organization | `default` |
