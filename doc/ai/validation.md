# Boilerplate validation protocol

Run these prompts against a fresh fork to verify the boilerplate guides AI correctly.  
Use after major changes to `AGENTS.md`, templates, or reference implementations.

## Pass criteria (all tests)

- [ ] Files in correct locations
- [ ] No Supabase calls in page components
- [ ] Lazy route in `app.routes.ts`
- [ ] RLS policies on new tables
- [ ] Filters use `signal()` + `computed()` (not plain properties)
- [ ] Delete uses dialog, not `confirm()`
- [ ] Dialogs use `stateChanged` sync
- [ ] `npm run build` succeeds

---

## Test 1 — Full CRUD feature

### Prompt

```
Add a `products` feature with full CRUD, scoped to the current organization, admin only
(super_admin + organization_admin).

- Table app.product: id, organization_id, name, is_active, created_at, updated_at
- RLS org-scoped; public.products view with security_invoker
- Lazy route /products with roleGuard
- List with search filter, create/edit dialog, delete confirmation modal
- Follow features/users CRUD pattern
- Sidebar link in main nav (not Administration)
```

### Expected artifacts

| File | Purpose |
|------|---------|
| `supabase/migrations/*_products.sql` | Schema + RLS + view |
| `src/app/features/products/*` | types, service, page, routes |
| `src/app/app.routes.ts` | lazy route registration |
| `src/app/core/layout/app-sidebar.component.ts` | nav link |

### Status

Validated in boilerplate v0 (feature removed after validation — re-run Test 1 on each release).

---

## Test 2 — Client-side filter

### Prompt

```
On the products list, add a status filter dropdown (all / active / inactive).
Use signal() for filter state and update filteredItems computed.
```

### Expected changes

- `products.page.ts`: `filterStatus = signal<'all' | 'active' | 'inactive'>('all')`
- Template: status `<select>` in filter bar

---

## Test 3 — Schema extension

### Prompt

```
Add a `notes` text column to products.
Create migration, run gen:types, add field to create/edit dialog.
```

### Expected changes

- New migration altering `app.product`
- `products.types.ts` updated
- Form field in dialog
- `npm run gen:types` run

---

## How to run manually

```bash
# After Test 1 migration
npx supabase db reset
npm run gen:types
npm run build
```

Log results in your release notes when validating a boilerplate version.
