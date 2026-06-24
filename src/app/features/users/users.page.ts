// Reference implementation — see doc/ai/crud-pattern.md
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideEdit,
  LucidePlus,
  LucideRefreshCw,
  LucideTrash2,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { toast } from 'ngx-sonner';
import { AuthService } from '@app/core/auth/auth.service';
import type { AppRole } from '@app/core/auth/auth.types';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmDialogImports } from '@app/shared/ui/dialog';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';
import { HlmSkeletonImports } from '@app/shared/ui/skeleton';
import { HlmTableImports } from '@app/shared/ui/table';
import type { ManagedUser } from './users.types';
import { UsersService } from './users.service';

type DialogMode = 'create' | 'edit';
type UserStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    LucideUsers,
    LucidePlus,
    LucideRefreshCw,
    LucideEdit,
    LucideTrash2,
    LucideX,
    BrnDialogContent,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
            <svg lucideUsers class="size-6 text-primary"></svg>
            Utilisateurs
          </h1>
          <p class="text-muted-foreground text-sm mt-1">
            Gérez les comptes et les rôles de votre organisation.
          </p>
        </div>
        <button hlmBtn type="button" (click)="openCreate()">
          <svg lucidePlus class="size-4"></svg>
          Nouvel utilisateur
        </button>
      </div>

      <div class="rounded-lg border bg-card p-4 space-y-3">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end flex-1">
            <div class="space-y-1 w-full sm:max-w-sm">
              <label hlmLabel for="user-search" class="text-xs">Recherche</label>
              <div class="relative">
                <input
                  hlmInput
                  id="user-search"
                  type="search"
                  placeholder="Nom, email, organisation, rôle…"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  name="search"
                  class="w-full pr-9"
                />
                @if (searchQuery()) {
                  <button
                    hlmBtn
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    class="absolute right-1 top-1/2 -translate-y-1/2"
                    aria-label="Effacer la recherche"
                    (click)="searchQuery.set('')"
                  >
                    <svg lucideX class="size-4"></svg>
                  </button>
                }
              </div>
            </div>

            @if (authService.hasRole('super_admin')) {
              <div class="space-y-1 w-full sm:w-48">
                <label hlmLabel for="user-org-filter" class="text-xs">Organisation</label>
                <select
                  id="user-org-filter"
                  [ngModel]="filterOrganizationId()"
                  (ngModelChange)="filterOrganizationId.set($event)"
                  name="filterOrganizationId"
                  class="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Toutes</option>
                  @for (organization of usersService.organizations(); track organization.id) {
                    <option [value]="organization.id">{{ organization.name }}</option>
                  }
                </select>
              </div>
            }

            <div class="space-y-1 w-full sm:w-40">
              <label hlmLabel for="user-status-filter" class="text-xs">Statut</label>
              <select
                id="user-status-filter"
                [ngModel]="filterStatus()"
                (ngModelChange)="onFilterStatusChange($event)"
                name="filterStatus"
                class="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <span class="text-xs text-muted-foreground tabular-nums">
              {{ filteredUsers().length }} / {{ usersService.users().length }}
            </span>
            @if (hasActiveFilters()) {
              <button hlmBtn variant="ghost" size="sm" type="button" (click)="clearFilters()">
                Réinitialiser
              </button>
            }
            <button
              hlmBtn
              variant="outline"
              type="button"
              [disabled]="usersService.loading()"
              (click)="refresh()"
            >
              <svg
                lucideRefreshCw
                class="size-4"
                [class.animate-spin]="usersService.loading()"
              ></svg>
              Actualiser
            </button>
          </div>
        </div>
      </div>

      @if (usersService.loading()) {
        <div class="space-y-3">
          <div hlmSkeleton class="h-10 w-full"></div>
          <div hlmSkeleton class="h-10 w-full"></div>
          <div hlmSkeleton class="h-10 w-full"></div>
        </div>
      } @else {
        <div hlmTableContainer class="rounded-lg border bg-card">
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh>Nom</th>
                <th hlmTh>Email</th>
                @if (authService.hasRole('super_admin')) {
                  <th hlmTh>Organisation</th>
                }
                <th hlmTh>Statut</th>
                <th hlmTh>Rôles</th>
                <th hlmTh>Créé le</th>
                <th hlmTh class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (user of filteredUsers(); track user.uid) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">{{ user.display_name || '—' }}</td>
                  <td hlmTd class="font-mono text-xs">{{ user.email }}</td>
                  @if (authService.hasRole('super_admin')) {
                    <td hlmTd>{{ user.organization_name || '—' }}</td>
                  }
                  <td hlmTd>
                    @if (user.is_active) {
                      <span class="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Actif</span>
                    } @else {
                      <span class="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">Inactif</span>
                    }
                  </td>
                  <td hlmTd>
                    <div class="flex flex-wrap gap-1">
                      @for (role of user.roles; track role) {
                        <span class="text-xs rounded-full border px-2 py-0.5">{{ role }}</span>
                      }
                      @if (user.roles.length === 0) {
                        <span class="text-xs text-muted-foreground">—</span>
                      }
                    </div>
                  </td>
                  <td hlmTd class="text-muted-foreground text-xs">
                    {{ user.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td hlmTd class="text-end">
                    <div class="flex justify-end gap-1">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        (click)="openEdit(user)"
                      >
                        <svg lucideEdit class="size-4"></svg>
                      </button>
                      @if (user.uid !== authService.user()?.id) {
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          (click)="openDeleteDialog(user)"
                        >
                          <svg lucideTrash2 class="size-4 text-destructive"></svg>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td
                    hlmTd
                    [attr.colspan]="authService.hasRole('super_admin') ? 7 : 6"
                    class="text-center py-8 text-muted-foreground"
                  >
                    @if (hasActiveFilters()) {
                      Aucun utilisateur ne correspond aux filtres.
                    } @else {
                      Aucun utilisateur trouvé.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <hlm-dialog [state]="deleteDialogState()" (stateChanged)="onDeleteDialogStateChanged($event)">
        <ng-template brnDialogContent>
          <hlm-dialog-content>
            <hlm-dialog-header>
              <h3 hlmDialogTitle>Supprimer l'utilisateur</h3>
              <p hlmDialogDescription>
                @if (deletingUser(); as user) {
                  Êtes-vous sûr de vouloir supprimer
                  <span class="font-medium text-foreground">{{ user.display_name || user.email }}</span>
                  ? Cette action est irréversible.
                }
              </p>
            </hlm-dialog-header>
            <hlm-dialog-footer>
              <button hlmBtn variant="ghost" type="button" (click)="closeDeleteDialog()">Annuler</button>
              <button
                hlmBtn
                variant="destructive"
                type="button"
                [disabled]="usersService.saving()"
                (click)="executeDelete()"
              >
                {{ usersService.saving() ? 'Suppression…' : 'Supprimer' }}
              </button>
            </hlm-dialog-footer>
          </hlm-dialog-content>
        </ng-template>
      </hlm-dialog>

      <hlm-dialog [state]="dialogState()" (stateChanged)="onDialogStateChanged($event)">
        <ng-template brnDialogContent>
          <hlm-dialog-content>
            <hlm-dialog-header>
              <h3 hlmDialogTitle>
                @if (dialogMode() === 'create') {
                  Nouvel utilisateur
                } @else {
                  Modifier l'utilisateur
                }
              </h3>
              <p hlmDialogDescription class="text-xs">
                @if (dialogMode() === 'create') {
                  Créez un compte et assignez les rôles applicatifs.
                } @else {
                  Modifiez le profil de {{ editingUser()?.email }}.
                }
              </p>
            </hlm-dialog-header>

            <form class="space-y-4 py-2" (ngSubmit)="save()">
              @if (dialogMode() === 'create') {
                <div class="space-y-2">
                  <label hlmLabel for="user-email">Email</label>
                  <input
                    hlmInput
                    id="user-email"
                    type="email"
                    [(ngModel)]="formEmail"
                    name="formEmail"
                    required
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label hlmLabel for="user-password">Mot de passe</label>
                  <input
                    hlmInput
                    id="user-password"
                    type="password"
                    [(ngModel)]="formPassword"
                    name="formPassword"
                    required
                    minlength="8"
                    class="w-full"
                  />
                </div>
              }

              <div class="space-y-2">
                <label hlmLabel for="user-name">Nom complet</label>
                <input
                  hlmInput
                  id="user-name"
                  type="text"
                  [(ngModel)]="formDisplayName"
                  name="formDisplayName"
                  class="w-full"
                />
              </div>

              @if (authService.hasRole('super_admin')) {
                <div class="space-y-2">
                  <label hlmLabel for="user-organization">Organisation</label>
                  <select
                    id="user-organization"
                    [(ngModel)]="formOrganizationId"
                    name="formOrganizationId"
                    class="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  >
                    @for (organization of usersService.organizations(); track organization.id) {
                      <option [value]="organization.id">{{ organization.name }}</option>
                    }
                  </select>
                </div>
              }

              <div class="space-y-2">
                <span hlmLabel>Rôles</span>
                <div class="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                  @for (role of selectableRoles(); track role.id) {
                    <label class="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        class="mt-1 accent-primary"
                        [checked]="formRoles.includes(role.name)"
                        (change)="toggleRole(role.name)"
                      />
                      <span>
                        <span class="font-medium">{{ role.name }}</span>
                        @if (role.description) {
                          <span class="block text-xs text-muted-foreground">{{ role.description }}</span>
                        }
                      </span>
                    </label>
                  }
                </div>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" class="accent-primary" [(ngModel)]="formIsActive" name="formIsActive" />
                  Compte actif
                </label>
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    class="accent-primary"
                    [(ngModel)]="formMustChangePassword"
                    name="formMustChangePassword"
                  />
                  Mot de passe à changer
                </label>
              </div>

              <hlm-dialog-footer>
                <button hlmBtn variant="ghost" type="button" (click)="closeDialog()">Annuler</button>
                <button hlmBtn type="submit" [disabled]="usersService.saving()">
                  {{ usersService.saving() ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </hlm-dialog-footer>
            </form>
          </hlm-dialog-content>
        </ng-template>
      </hlm-dialog>
    </div>
  `,
})
export class UsersPage implements OnInit {
  readonly usersService = inject(UsersService);
  readonly authService = inject(AuthService);

  readonly dialogMode = signal<DialogMode>('create');
  readonly dialogState = signal<'open' | 'closed'>('closed');
  readonly deleteDialogState = signal<'open' | 'closed'>('closed');
  readonly editingUser = signal<ManagedUser | null>(null);
  readonly deletingUser = signal<ManagedUser | null>(null);

  readonly searchQuery = signal('');
  readonly filterOrganizationId = signal('');
  readonly filterStatus = signal<UserStatusFilter>('all');
  formEmail = '';
  formPassword = '';
  formDisplayName = '';
  formOrganizationId = '';
  formRoles: AppRole[] = [];
  formIsActive = true;
  formMustChangePassword = false;

  readonly selectableRoles = computed(() => {
    const assignable = this.usersService.getAssignableRoles();
    return this.usersService.roles().filter((role) => assignable.includes(role.name));
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim() !== '' ||
      this.filterOrganizationId() !== '' ||
      this.filterStatus() !== 'all',
  );

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const organizationId = this.filterOrganizationId();
    const status = this.filterStatus();
    let users = this.usersService.users();

    if (organizationId) {
      users = users.filter((user) => user.organization_id === organizationId);
    }

    if (status === 'active') {
      users = users.filter((user) => user.is_active);
    } else if (status === 'inactive') {
      users = users.filter((user) => !user.is_active);
    }

    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        (user.display_name && user.display_name.toLowerCase().includes(query)) ||
        (user.organization_name && user.organization_name.toLowerCase().includes(query)) ||
        user.roles.some((role) => role.toLowerCase().includes(query)),
    );
  });

  clearFilters() {
    this.searchQuery.set('');
    this.filterOrganizationId.set('');
    this.filterStatus.set('all');
  }

  onFilterStatusChange(value: string) {
    if (value === 'all' || value === 'active' || value === 'inactive') {
      this.filterStatus.set(value);
    }
  }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    try {
      await this.usersService.load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      toast.error(message);
    }
  }

  openCreate() {
    this.dialogMode.set('create');
    this.editingUser.set(null);
    this.resetForm();
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  openEdit(user: ManagedUser) {
    this.dialogMode.set('edit');
    this.editingUser.set(user);
    this.formEmail = user.email;
    this.formPassword = '';
    this.formDisplayName = user.display_name ?? '';
    this.formOrganizationId = user.organization_id ?? '';
    this.formRoles = [...user.roles];
    this.formIsActive = user.is_active;
    this.formMustChangePassword = user.must_change_password;
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  onDialogStateChanged(state: 'open' | 'closed') {
    this.dialogState.set(state);
    if (state === 'closed') {
      this.editingUser.set(null);
    }
  }

  closeDialog() {
    this.dialogState.set('closed');
  }

  toggleRole(role: AppRole) {
    if (this.formRoles.includes(role)) {
      this.formRoles = this.formRoles.filter((r) => r !== role);
    } else {
      this.formRoles = [...this.formRoles, role];
    }
  }

  resetForm() {
    this.formEmail = '';
    this.formPassword = '';
    this.formDisplayName = '';
    this.formOrganizationId = this.authService.userProfile()?.organization_id ?? '';
    this.formRoles = ['user'];
    this.formIsActive = true;
    this.formMustChangePassword = false;
  }

  openDeleteDialog(user: ManagedUser) {
    this.deletingUser.set(user);
    this.deleteDialogState.set('closed');
    this.deleteDialogState.set('open');
  }

  onDeleteDialogStateChanged(state: 'open' | 'closed') {
    this.deleteDialogState.set(state);
    if (state === 'closed') {
      this.deletingUser.set(null);
    }
  }

  closeDeleteDialog() {
    this.deleteDialogState.set('closed');
  }

  async executeDelete() {
    const user = this.deletingUser();
    if (!user) {
      return;
    }
    try {
      await this.usersService.remove(user.uid);
      toast.success('Utilisateur supprimé.');
      this.closeDeleteDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression.';
      toast.error(message);
    }
  }

  async save() {
    const organizationId = this.formOrganizationId || null;

    if (this.formRoles.length === 0) {
      toast.error('Sélectionnez au moins un rôle.');
      return;
    }

    try {
      if (this.dialogMode() === 'create') {
        await this.usersService.create({
          email: this.formEmail.trim(),
          password: this.formPassword,
          display_name: this.formDisplayName.trim(),
          organization_id: organizationId,
          roles: this.formRoles,
          is_active: this.formIsActive,
          must_change_password: this.formMustChangePassword,
        });
        toast.success('Utilisateur créé avec succès.');
      } else {
        const user = this.editingUser();
        if (!user) {
          return;
        }
        await this.usersService.update(user.uid, {
          display_name: this.formDisplayName.trim(),
          ...(this.authService.hasRole('super_admin')
            ? { organization_id: organizationId }
            : {}),
          roles: this.formRoles,
          is_active: this.formIsActive,
          must_change_password: this.formMustChangePassword,
        });
        toast.success('Utilisateur mis à jour.');
      }
      this.closeDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.';
      toast.error(message);
    }
  }
}
