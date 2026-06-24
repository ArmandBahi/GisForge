import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideEdit,
  LucideFolder,
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
import type { ManagedGroup } from './groups.types';
import { GroupsService } from './groups.service';

type DialogMode = 'create' | 'edit';

@Component({
  selector: 'app-groups-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    LucideFolder,
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
            <svg lucideFolder class="size-6 text-primary"></svg>
            Groupes
          </h1>
          <p class="text-muted-foreground text-sm mt-1">
            Organisez les utilisateurs par groupes dans votre organisation.
          </p>
        </div>
        <button hlmBtn type="button" (click)="openCreate()">
          <svg lucidePlus class="size-4"></svg>
          Nouveau groupe
        </button>
      </div>

      <div class="rounded-lg border bg-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          hlmInput
          type="search"
          placeholder="Rechercher par nom ou description…"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          name="search"
          class="w-full sm:max-w-sm"
        />
        <button
          hlmBtn
          variant="outline"
          type="button"
          [disabled]="groupsService.loading()"
          (click)="refresh()"
        >
          <svg
            lucideRefreshCw
            class="size-4"
            [class.animate-spin]="groupsService.loading()"
          ></svg>
          Actualiser
        </button>
      </div>

      @if (groupsService.loading()) {
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
                <th hlmTh>Description</th>
                <th hlmTh>Membres</th>
                <th hlmTh>Créé le</th>
                <th hlmTh class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (group of filteredGroups(); track group.id) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">{{ group.name }}</td>
                  <td hlmTd class="text-muted-foreground text-sm max-w-xs truncate">
                    {{ group.description || '—' }}
                  </td>
                  <td hlmTd>
                    <span class="text-xs rounded-full border px-2 py-0.5">{{ group.member_count }}</span>
                  </td>
                  <td hlmTd class="text-muted-foreground text-xs">
                    {{ group.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td hlmTd class="text-end">
                    <div class="flex justify-end gap-1">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        (click)="openEdit(group)"
                      >
                        <svg lucideEdit class="size-4"></svg>
                      </button>
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        (click)="confirmDelete(group)"
                      >
                        <svg lucideTrash2 class="size-4 text-destructive"></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr hlmTr>
                  <td hlmTd colspan="5" class="text-center py-8 text-muted-foreground">
                    Aucun groupe trouvé.
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
                {{ dialogMode() === 'create' ? 'Nouveau groupe' : 'Modifier le groupe' }}
              </h3>
              <p hlmDialogDescription class="text-xs">
                @if (dialogMode() === 'create') {
                  Créez un groupe et assignez des membres.
                } @else {
                  Modifiez {{ editingGroup()?.name }}.
                }
              </p>
            </hlm-dialog-header>

            <form class="space-y-4 py-2" (ngSubmit)="save()">
              <div class="space-y-2">
                <label hlmLabel for="group-name">Nom</label>
                <input
                  hlmInput
                  id="group-name"
                  type="text"
                  [(ngModel)]="formName"
                  name="formName"
                  required
                  class="w-full"
                />
              </div>

              <div class="space-y-2">
                <label hlmLabel for="group-description">Description</label>
                <input
                  hlmInput
                  id="group-description"
                  type="text"
                  [(ngModel)]="formDescription"
                  name="formDescription"
                  class="w-full"
                />
              </div>

              <div class="space-y-2">
                <span hlmLabel>Membres</span>
                @if (groupsService.members().length === 0) {
                  <p class="text-xs text-muted-foreground rounded-md border p-3">
                    Aucun utilisateur disponible pour cette organisation.
                  </p>
                } @else {
                  <div class="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                    @for (member of groupsService.members(); track member.uid) {
                      <label class="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          class="mt-1 accent-primary"
                          [checked]="formMemberUids.includes(member.uid)"
                          (change)="toggleMember(member.uid)"
                        />
                        <span>
                          <span class="font-medium">{{ member.display_name || member.email }}</span>
                          @if (member.display_name) {
                            <span class="block text-xs text-muted-foreground font-mono">{{ member.email }}</span>
                          }
                        </span>
                      </label>
                    }
                  </div>
                }
              </div>

              <hlm-dialog-footer>
                @if (dialogMode() === 'edit') {
                  <button
                    hlmBtn
                    variant="destructive"
                    type="button"
                    class="mr-auto"
                    [disabled]="groupsService.saving()"
                    (click)="deleteFromDialog()"
                  >
                    Supprimer
                  </button>
                }
                <button hlmBtn variant="ghost" type="button" (click)="closeDialog()">Annuler</button>
                <button hlmBtn type="submit" [disabled]="groupsService.saving()">
                  {{ groupsService.saving() ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </hlm-dialog-footer>
            </form>
          </hlm-dialog-content>
        </ng-template>
      </hlm-dialog>
    </div>
  `,
})
export class GroupsPage implements OnInit {
  readonly groupsService = inject(GroupsService);

  readonly dialogMode = signal<DialogMode>('create');
  readonly dialogState = signal<'open' | 'closed'>('closed');
  readonly editingGroup = signal<ManagedGroup | null>(null);

  readonly searchQuery = signal('');
  formName = '';
  formDescription = '';
  formMemberUids: string[] = [];

  readonly filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const groups = this.groupsService.groups();
    if (!query) {
      return groups;
    }
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        (group.description && group.description.toLowerCase().includes(query)),
    );
  });

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    try {
      await this.groupsService.load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      toast.error(message);
    }
  }

  async openCreate() {
    this.dialogMode.set('create');
    this.editingGroup.set(null);
    this.resetForm();
    await this.loadMembersForForm();
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  async openEdit(group: ManagedGroup) {
    this.dialogMode.set('edit');
    this.editingGroup.set(group);
    this.formName = group.name;
    this.formDescription = group.description ?? '';
    this.formMemberUids = [...group.member_uids];
    await this.loadMembersForForm();
    this.dialogState.set('closed');
    this.dialogState.set('open');
  }

  onDialogStateChanged(state: 'open' | 'closed') {
    this.dialogState.set(state);
    if (state === 'closed') {
      this.editingGroup.set(null);
    }
  }

  closeDialog() {
    this.dialogState.set('closed');
  }

  resetForm() {
    this.formName = '';
    this.formDescription = '';
    this.formMemberUids = [];
  }

  async loadMembersForForm() {
    try {
      await this.groupsService.loadMembers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement des membres.';
      toast.error(message);
    }
  }

  toggleMember(uid: string) {
    if (this.formMemberUids.includes(uid)) {
      this.formMemberUids = this.formMemberUids.filter((id) => id !== uid);
    } else {
      this.formMemberUids = [...this.formMemberUids, uid];
    }
  }

  async save() {
    const description = this.formDescription.trim() || null;

    try {
      if (this.dialogMode() === 'create') {
        await this.groupsService.create({
          name: this.formName.trim(),
          description,
          member_uids: this.formMemberUids,
        });
        toast.success('Groupe créé avec succès.');
      } else {
        const group = this.editingGroup();
        if (!group) {
          return;
        }
        await this.groupsService.update(group.id, {
          name: this.formName.trim(),
          description,
          member_uids: this.formMemberUids,
        });
        toast.success('Groupe mis à jour.');
      }
      this.closeDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.';
      toast.error(message);
    }
  }

  async confirmDelete(group: ManagedGroup) {
    if (!confirm(`Supprimer le groupe « ${group.name} » ? Cette action est irréversible.`)) {
      return;
    }
    await this.deleteGroup(group.id);
  }

  async deleteFromDialog() {
    const group = this.editingGroup();
    if (!group) {
      return;
    }
    if (!confirm(`Supprimer le groupe « ${group.name} » ? Cette action est irréversible.`)) {
      return;
    }
    await this.deleteGroup(group.id);
    this.closeDialog();
  }

  private async deleteGroup(id: string) {
    try {
      await this.groupsService.remove(id);
      toast.success('Groupe supprimé.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression.';
      toast.error(message);
    }
  }
}
