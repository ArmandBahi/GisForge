# Example prompt: add a column filter

Copy and adapt when extending an existing list view.

---

## Prompt

```
On the users list page, add a filter by role (dropdown: all, user, organization_admin, super_admin).

Requirements:
- Use signal() for filter state (OnPush component)
- Update filteredUsers computed to include role filter
- Add clear-filters button if not already present
- Do not add Supabase calls in the component — filter client-side on loaded data
```

## Expected changes

| File | Change |
|------|--------|
| `users.page.ts` | `filterRole = signal('all')`, update `filteredUsers` computed, add `<select>` in filter bar |

## What to verify

- [ ] Filter reacts immediately when changed (signal, not plain property)
- [ ] `hasActiveFilters` computed includes new filter
- [ ] Clear filters resets the new filter too
- [ ] No new service methods needed (client-side filter)

## Anti-pattern (do not generate)

```typescript
// BAD — plain property won't work with OnPush + computed
filterRole = 'all';

// GOOD
readonly filterRole = signal<'all' | AppRole>('all');
```
