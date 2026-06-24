import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideBuilding2,
  LucideEdit,
  LucidePlus,
  LucideRefreshCw,
  LucideTrash2,
} from '@lucide/angular';
import { BrnDialogContent } from '@spartan-ng/brain/dialog';
import { toast } from 'ngx-sonner';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmDialogImports } from '@app/shared/ui/dialog';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';
import { HlmSkeletonImports } from '@app/shared/ui/skeleton';
import { HlmTableImports } from '@app/shared/ui/table';
import type { ManagedOrganization } from './organizations.types';
import { OrganizationsService } from './organizations.service';

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-organizations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    LucideBuilding2,
    LucidePlus,
    LucideRefreshCw,
    LucideEdit,
    LucideTrash2,
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
            <svg lucideBuilding2 class="size-6 text-primary"></svg>
            Organisations
          </h1>
          <p class="text-muted-foreground text-sm mt-1">
            Gérez les organisations de la plateforme.
          </p>
        </div>
        <button hlmBtn type="button" (click)="openCreate()">
          <svg lucidePlus class="size-4"></svg>
          Nouvelle organisation
        </button>
      </div>

      <div class="rounded-lg border bg-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          hlmInput
          type="search"
          placeholder="Rechercher par nom ou slug…"
          [(ngModel)]="searchQuery"
          name="search"
          class="w-full sm:max-w-sm"
        />
        <button
          hlmBtn
          variant="outline"
          type="button"
          [disabled]="organizationsService.loading()"
          (click)="refresh()"
        >
          <svg
            lucideRefreshCw
            class="size-4"
            [class.animate-spin]="organizationsService.loading()"
          ></svg>
          Actualiser
        </button>
      </div>

      @if (organizationsService.loading()) {
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
                <th hlmTh>Slug</th>
                <th hlmTh>Statut</th>
                <th hlmTh>Créé le</th>
                <th hlmTh class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (organization of filteredOrganizations(); track organization.id) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">{{ organization.name }}</td>
                  <td hlmTd class="font-mono text-xs">{{ organization.slug }}</td>
                  <td hlmTd>
                    @if (organization.is_active) {
                      <span class="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Active</span>
                    } @else {
                      <span class="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">Inactive</span>
                    }
                  </td>
                  <td hlmTd class="text-muted-foreground text-xs">
                    {{ organization.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td hlmTd class="text-end">
                    <div class="flex justify-end gap-1">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        (click)="openEdit(organization)"
                      >
                        <svg lucideEdit class="size-4"></svg>
                      </button>
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        (click)="confirmDelete(organization)"
                      >
                        <svg lucideTrash2 class="size-4 text-destructive"></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td hlmTd colspan="5" class="text-center py-8 text-muted-foreground">
                    Aucune organisation trouvée.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <hlm-dialog [state]="dialogState()" (stateChanged)="onDialogStateChanged($event)">
        <ng-template brnDialogContent>
          <hlm-dialog-content>
            <hlm-dialog-header>
              <h3 hlmDialogTitle>
                @if (dialogMode() === 'create') {
                  Nouvelle organisation
                } @else {
                  Modifier l'organisation
                }
              </h3>
            </hlm-dialog-header>

            <form class="space-y-4 py-2" (ngSubmit)="save()">
              <div class="space-y-2">
                <label hlmLabel for="org-name">Nom</label>
                <input
                  hlmInput
                  id="org-name"
                  type="text"
                  [(ngModel)]="formName"
                  name="formName"
                  required
                  class="w-full"
                />
              </div>

              <div class="space-y-2">
                <label hlmLabel for="org-slug">Slug</label>
                <input
                  hlmInput
                  id="org-slug"
                  type="text"
                  [(ngModel)]="formSlug"
                  name="formSlug"
                  required
                  class="w-full font-mono text-sm"
                />
              </div>

              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" class="accent-primary" [(ngModel)]="formIsActive" name="formIsActive" />
                Organisation active
              </label>

              <hlm-dialog-footer>
                <button hlmBtn variant="ghost" type="button" (click)="closeDialog()">Annuler</button>
                <button hlmBtn type="submit" [disabled]="organizationsService.saving()">
                  {{ organizationsService.saving() ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </hlm-dialog-footer>
            </form>
          </hlm-dialog-content>
        </ng-template>
      </hlm-dialog>
    </div>
  `,
})
export class OrganizationsPage implements OnInit {
  readonly organizationsService = inject(OrganizationsService);

  readonly dialogMode = signal<DialogMode>('create');
  readonly dialogState = signal<'open' | 'closed'>('closed');
  readonly editingOrganization = signal<ManagedOrganization | null>(null);

  searchQuery = '';
  formName = '';
  formSlug = '';
  formIsActive = true;

  readonly filteredOrganizations = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const organizations = this.organizationsService.organizations();
    if (!query) {
      return organizations;
    }
    return organizations.filter(
      (organization) =>
        organization.name.toLowerCase().includes(query) ||
        organization.slug.toLowerCase().includes(query),
    );
  });

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    try {
      await this.organizationsService.load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      toast.error(message);
    }
  }

  openCreate() {
    this.dialogMode.set('create');
    this.editingOrganization.set(null);
    this.resetForm();
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  openEdit(organization: ManagedOrganization) {
    this.dialogMode.set('edit');
    this.editingOrganization.set(organization);
    this.formName = organization.name;
    this.formSlug = organization.slug;
    this.formIsActive = organization.is_active;
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  onDialogStateChanged(state: 'open' | 'closed') {
    this.dialogState.set(state);
    if (state === 'closed') {
      this.editingOrganization.set(null);
    }
  }

  closeDialog() {
    this.dialogState.set('closed');
  }

  resetForm() {
    this.formName = '';
    this.formSlug = '';
    this.formIsActive = true;
  }

  async save() {
    const name = this.formName.trim();
    const slug = this.formSlug.trim().toLowerCase();

    try {
      if (this.dialogMode() === 'create') {
        await this.organizationsService.create({
          name,
          slug,
          is_active: this.formIsActive,
        });
        toast.success('Organisation créée avec succès.');
      } else {
        const organization = this.editingOrganization();
        if (!organization) {
          return;
        }
        await this.organizationsService.update(organization.id, {
          name,
          slug,
          is_active: this.formIsActive,
        });
        toast.success('Organisation mise à jour.');
      }
      this.closeDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.';
      toast.error(message);
    }
  }

  async confirmDelete(organization: ManagedOrganization) {
    if (!confirm(`Supprimer l'organisation « ${organization.name} » ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await this.organizationsService.remove(organization.id);
      toast.success('Organisation supprimée.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression.';
      toast.error(message);
    }
  }
}
