# Example prompt: add a CRUD feature

Copy and adapt this prompt when testing or generating a new feature.

---

## Prompt

```
Add a new feature `invoices` with full CRUD, scoped to the current organization.

Requirements:
- Database: table `app.invoice` with columns id, organization_id, name, amount (numeric), 
  is_active (boolean), created_at, updated_at
- RLS: org-scoped read for all authenticated users in the org; 
  write for organization_admin and super_admin
- Public view `public.invoices` with security_invoker
- Frontend: lazy route at /invoices, admin only (super_admin + organization_admin)
- UI: list with search filter, create/edit dialog, delete confirmation modal
- Follow the CRUD pattern from features/users
- Add sidebar link in Administration section
- Run gen:types after migration
- Validate with npm run build
```

## Expected output locations

| Artifact | Path |
|----------|------|
| Migration | `supabase/migrations/*_invoices.sql` |
| Types | `src/app/features/invoices/invoices.types.ts` |
| Service | `src/app/features/invoices/invoices.service.ts` |
| Page | `src/app/features/invoices/invoices.page.ts` |
| Routes | `src/app/features/invoices/invoices.routes.ts` |
| Route reg | `src/app/app.routes.ts` |
| Sidebar | `src/app/core/layout/app-sidebar.component.ts` |
| Types gen | `src/app/core/supabase/database.types.ts` |

## What to verify

- [ ] No Supabase calls in the page component
- [ ] Filters use `signal()` + `computed()`
- [ ] Dialogs use `stateChanged` sync
- [ ] Delete uses modal, not `confirm()`
- [ ] Route is lazy-loaded
- [ ] RLS policies exist
- [ ] `npm run build` succeeds
