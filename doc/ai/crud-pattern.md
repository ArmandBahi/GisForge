# CRUD pattern walkthrough

Reference implementation: **`src/app/features/users/`**

## Overview

A standard referential CRUD screen in GisForge follows this structure:

```
PageHeader (title + Add button)
  → Filter bar (signals + computed)
  → Table (hlm-table)
  → Delete confirmation dialog
  → Create/edit dialog
  → Service (signals + Supabase)
  → Toasts
```

## 1. Types (`users.types.ts`)

Define view models and DTOs:

```typescript
export interface ManagedUser {
  uid: string;
  email: string;
  display_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  roles: AppRole[];
}

export interface CreateUserDto { /* ... */ }
export interface UpdateUserDto { /* ... */ }
```

## 2. Service (`users.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly _users = signal<ManagedUser[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.from('users').select('*');
      if (error) throw error;
      this._users.set(mapped);
    } finally {
      this._loading.set(false);
    }
  }

  async create(dto: CreateUserDto): Promise<void> {
    this._saving.set(true);
    try {
      await this.supabase.rpc('create_user', { /* ... */ });
      await this.load();
    } finally {
      this._saving.set(false);
    }
  }
}
```

Key points:
- Private writable signals, public readonly exports
- `load()` after every mutation
- RPC for operations that cross RLS boundaries

## 3. Routes (`users.routes.ts`)

```typescript
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./users.page').then((m) => m.UsersPage),
  },
];
```

## 4. Register route (`app.routes.ts`)

```typescript
{
  path: 'users',
  canActivate: [roleGuard(['super_admin', 'organization_admin'])],
  loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
},
```

## 5. Page (`users.page.ts`)

### Component setup

```typescript
@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* Spartan, Lucide, FormsModule */],
  template: `...`,
})
export class UsersPage implements OnInit {
  readonly usersService = inject(UsersService);
  readonly authService = inject(AuthService);

  ngOnInit() {
    this.usersService.load();
  }
}
```

### Filters (signals required for OnPush)

```typescript
readonly searchQuery = signal('');
readonly filterStatus = signal<'all' | 'active' | 'inactive'>('all');

readonly filteredUsers = computed(() => {
  let users = this.usersService.users();
  const query = this.searchQuery().toLowerCase().trim();
  if (query) {
    users = users.filter(u => u.email.includes(query));
  }
  return users;
});
```

Template binding:

```html
<input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
```

### Dialog state sync

```typescript
readonly dialogState = signal<'open' | 'closed'>('closed');

openCreate() {
  this.dialogMode.set('create');
  this.resetForm();
  this.dialogState.set('closed');
  this.dialogState.set('open');  // force re-render
}

onDialogStateChanged(state: 'open' | 'closed') {
  this.dialogState.set(state);
  if (state === 'closed') {
    this.editingUser.set(null);
  }
}
```

Template:

```html
<hlm-dialog [state]="dialogState()" (stateChanged)="onDialogStateChanged($event)">
  <ng-template brnDialogContent>
    <hlm-dialog-content>
      <hlm-dialog-header>
        <h3 hlmDialogTitle>
          @if (dialogMode() === 'create') { New item } @else { Edit item }
        </h3>
      </hlm-dialog-header>
      <!-- form -->
    </hlm-dialog-content>
  </ng-template>
</hlm-dialog>
```

Use `@if/@else` for dialog titles — avoid string interpolation with apostrophes in templates.

### Delete modal (not `confirm()`)

Separate `deleteDialogState` signal and `deletingUser` signal. Destructive button uses `variant="destructive"`.

## 6. Sidebar entry (`app-sidebar.component.ts`)

Administration section at the bottom of the sidebar:

```html
@if (authService.hasRole('super_admin') || authService.hasRole('organization_admin')) {
  <nav class="mt-auto ...">
    <a routerLink="/users" routerLinkActive="...">...</a>
  </nav>
}
```

## 7. Toasts

```typescript
import { toast } from 'ngx-sonner';

try {
  await this.usersService.create(dto);
  toast.success('User created');
  this.closeDialog();
} catch (err) {
  toast.error('Failed to create user');
}
```
