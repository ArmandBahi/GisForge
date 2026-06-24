import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideBuilding2 } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmSkeletonImports } from '@app/shared/ui/skeleton';
import { OrganizationsService } from './organizations.service';

@Component({
  selector: 'app-my-organization-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, LucideBuilding2, HlmButtonImports, HlmSkeletonImports],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
          <svg lucideBuilding2 class="size-6 text-primary"></svg>
          Mon organisation
        </h1>
        <p class="text-muted-foreground text-sm mt-1">
          Informations sur votre organisation.
        </p>
      </div>

      @if (organizationsService.loading()) {
        <div class="space-y-3 rounded-lg border bg-card p-6">
          <div hlmSkeleton class="h-6 w-48"></div>
          <div hlmSkeleton class="h-4 w-full"></div>
          <div hlmSkeleton class="h-4 w-2/3"></div>
        </div>
      } @else {
        @if (organizationsService.currentOrganization(); as organization) {
          <div class="rounded-lg border bg-card p-6 space-y-4 max-w-xl">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wide">Nom</p>
              <p class="text-lg font-semibold">{{ organization.name }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wide">Slug</p>
              <p class="font-mono text-sm">{{ organization.slug }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wide">Statut</p>
              @if (organization.is_active) {
                <span class="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Active</span>
              } @else {
                <span class="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">Inactive</span>
              }
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p class="text-xs text-muted-foreground">Créée le</p>
                <p class="text-sm">{{ organization.created_at | date: 'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Mise à jour</p>
                <p class="text-sm">{{ organization.updated_at | date: 'dd/MM/yyyy HH:mm' }}</p>
              </div>
            </div>
          </div>
        } @else {
          <div class="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Aucune organisation associée à votre compte.
          </div>
        }
      }
    </div>
  `,
})
export class MyOrganizationPage implements OnInit {
  readonly organizationsService = inject(OrganizationsService);

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    try {
      await this.organizationsService.loadCurrent();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      toast.error(message);
    }
  }
}
