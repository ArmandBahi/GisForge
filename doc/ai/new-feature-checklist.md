# New feature checklist

Follow these 12 steps when adding a business feature (e.g. `invoices`, `products`).

## 1. Database migration

Create `supabase/migrations/YYYYMMDDHHMMSS_<feature>.sql`:

- Table with `organization_id` FK if org-scoped
- `created_at`, `updated_at` timestamps
- RLS enabled with org-scoped policies
- `public.<table>` view with `security_invoker = true`
- GRANT on public view

See [supabase-conventions.md](supabase-conventions.md) for details.

## 2. Regenerate types

```bash
npm run gen:types
```

## 3. Create types file

`src/app/features/<feature>/<feature>.types.ts`

Define interfaces for list items, create DTO, update DTO.

## 4. Create service

`src/app/features/<feature>/<feature>.service.ts`

- Injectable `providedIn: 'root'`
- Private signals + readonly exports
- `load()`, `create()`, `update()`, `remove()`
- Supabase calls only here

## 5. Create page

`src/app/features/<feature>/<feature>.page.ts`

- `OnPush` change detection
- Inject service, call `load()` in `ngOnInit`
- Table + dialogs + toasts
- Filters as `signal()` + `computed()`

Copy patterns from `features/users` for CRUD screens.

## 6. Create routes

`src/app/features/<feature>/<feature>.routes.ts`

```typescript
export const <FEATURE>_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./<feature>.page').then(m => m.<Feature>Page) },
];
```

## 7. Register in app.routes.ts

```typescript
{
  path: '<feature>',
  canActivate: [roleGuard(['super_admin', 'organization_admin'])],
  loadChildren: () => import('./features/<feature>/<feature>.routes').then(m => m.<FEATURE>_ROUTES),
},
```

Adjust guards and roles as needed.

## 8. Add sidebar link

In `src/app/core/layout/app-sidebar.component.ts`:

- Main nav for business features (top section)
- Administration section (bottom) for admin-only features

## 9. Toasts

Success and error feedback on every mutation via `ngx-sonner`.

## 10. Filters (if list view)

- `searchQuery = signal('')`
- Additional filter signals as needed
- `filteredItems = computed(() => ...)`
- Clear button when filters active

## 11. Database documentation

Add or update `doc/bdd/<schema>.md` if new tables were created.

## 12. Validate

```bash
npm run build
```

Optionally run validation prompts from [validation.md](validation.md).
