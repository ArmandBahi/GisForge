# UI conventions

## Spartan UI (Helm)

Components are copied into `src/app/shared/ui/` — not installed as npm packages.

### Adding a component

```bash
npx @spartan-ng/cli add select
```

Config: `components.json` → `componentsPath: src/app/shared/ui`

### Imports

```typescript
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmDialogImports } from '@app/shared/ui/dialog';
import { HlmTableImports } from '@app/shared/ui/table';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
```

## Page layout

```html
<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
        <svg lucideIcon class="size-6 text-primary"></svg>
        Title
      </h1>
      <p class="text-muted-foreground text-sm mt-1">Description</p>
    </div>
    <button hlmBtn type="button" (click)="openCreate()">
      <svg lucidePlus class="size-4"></svg>
      Add
    </button>
  </div>

  <!-- Filter bar -->
  <div class="rounded-lg border bg-card p-4">...</div>

  <!-- Table or loading skeleton -->
</div>
```

## Dialogs

### State synchronization (required)

Spartan dialogs can desync if only opened via trigger. Always:

1. Bind `[state]="dialogState()"` and `(stateChanged)="onDialogStateChanged($event)"`
2. On open: `dialogState.set('closed')` then `dialogState.set('open')`
3. On close from component: `dialogState.set('closed')`

### Dialog titles

Use `@if/@else` blocks — not string interpolation with apostrophes:

```html
<h3 hlmDialogTitle>
  @if (dialogMode() === 'create') { New item } @else { Edit item }
</h3>
```

### Delete confirmation

Separate dialog with `deleteDialogState` signal. Use `variant="destructive"` on confirm button. Never use `confirm()`.

## Filters

With `ChangeDetectionStrategy.OnPush`, filter state must be signals:

```typescript
readonly searchQuery = signal('');

readonly filteredItems = computed(() => {
  const query = this.searchQuery().toLowerCase().trim();
  return this.service.items().filter(i => i.name.includes(query));
});
```

```html
<input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
```

Plain class properties will **not** trigger computed updates.

## Loading states

Use `hlm-skeleton` while `service.loading()` is true.

Disable buttons with `[disabled]="service.saving()"`.

## Icons

Lucide Angular — import icon components and use in template:

```typescript
import { LucidePlus, LucideEdit, LucideTrash2 } from '@lucide/angular';
```

```html
<svg lucidePlus class="size-4"></svg>
```

## Sidebar navigation

File: `src/app/core/layout/app-sidebar.component.ts`

Structure:
1. **Top** — main business nav (Dashboard, future features)
2. **Bottom (mt-auto)** — Administration section (Organizations, Users, Groups)
3. **Footer** — user name (links to `/my-profile`), sign out

Role-gated links:

```html
@if (authService.hasRole('super_admin')) { ... }
@if (authService.hasRole('super_admin') || authService.hasRole('organization_admin')) { ... }
```

Hide main nav when `mustChangePassword()` is active.

## Toasts

```typescript
import { toast } from 'ngx-sonner';

toast.success('Saved');
toast.error('Failed to save');
```

## Theming

Tailwind v4 + CSS variables in `src/styles.css`. Use semantic classes: `text-muted-foreground`, `bg-card`, `border`, `text-primary`.
