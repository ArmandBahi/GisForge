import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideEdit,
  LucidePlus,
  LucideRefreshCw,
  LucideUsers,
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

      <div class="rounded-lg border bg-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          hlmInput
          type="search"
          placeholder="Rechercher par nom ou email…"
          [(ngModel)]="searchQuery"
          name="search"
          class="w-full sm:max-w-sm"
        />
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
                    <button
                      hlmBtn
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      (click)="openEdit(user)"
                    >
                      <svg lucideEdit class="size-4"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td hlmTd colspan="6" class="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <hlm-dialog [state]="dialogState()">
        <ng-template brnDialogContent>
          <hlm-dialog-content>
            <hlm-dialog-header>
              <h3 hlmDialogTitle>
                {{ dialogMode() === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur' }}
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
                  <label hlmLabel for="user-client">Client</label>
                  <select
                    id="user-client"
                    [(ngModel)]="formClientId"
                    name="formClientId"
                    class="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Aucun client</option>
                    @for (client of usersService.clients(); track client.id) {
                      <option [value]="client.id">{{ client.name }}</option>
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
  readonly editingUser = signal<ManagedUser | null>(null);

  searchQuery = '';
  formEmail = '';
  formPassword = '';
  formDisplayName = '';
  formClientId = '';
  formRoles: AppRole[] = [];
  formIsActive = true;
  formMustChangePassword = false;

  readonly selectableRoles = computed(() => {
    const assignable = this.usersService.getAssignableRoles();
    return this.usersService.roles().filter((role) => assignable.includes(role.name));
  });

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const users = this.usersService.users();
    if (!query) {
      return users;
    }
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        (user.display_name && user.display_name.toLowerCase().includes(query)),
    );
  });

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
    this.dialogState.set('open');
  }

  openEdit(user: ManagedUser) {
    this.dialogMode.set('edit');
    this.editingUser.set(user);
    this.formEmail = user.email;
    this.formPassword = '';
    this.formDisplayName = user.display_name ?? '';
    this.formClientId = user.client_id ?? '';
    this.formRoles = [...user.roles];
    this.formIsActive = user.is_active;
    this.formMustChangePassword = user.must_change_password;
    this.dialogState.set('open');
  }

  closeDialog() {
    this.dialogState.set('closed');
    this.editingUser.set(null);
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
    this.formClientId = this.authService.userProfile()?.client_id ?? '';
    this.formRoles = ['user'];
    this.formIsActive = true;
    this.formMustChangePassword = false;
  }

  async save() {
    const clientId = this.formClientId || null;

    try {
      if (this.dialogMode() === 'create') {
        await this.usersService.create({
          email: this.formEmail.trim(),
          password: this.formPassword,
          display_name: this.formDisplayName.trim(),
          client_id: clientId,
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
          client_id: clientId,
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
