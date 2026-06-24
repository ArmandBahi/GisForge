import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideBuilding2, LucideUser } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@app/core/auth/auth.service';
import { OrganizationsService } from '@app/features/organizations/organizations.service';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';
import { HlmSkeletonImports } from '@app/shared/ui/skeleton';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    LucideBuilding2,
    LucideUser,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
  ],
  template: `
    <div class="space-y-6">
      @if (authService.mustChangePassword()) {
        <div class="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 max-w-xl">
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
            Changement de mot de passe obligatoire
          </p>
          <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Vous devez définir un nouveau mot de passe avant d'accéder à l'application.
          </p>
        </div>
      }

      <div>
        <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
          <svg lucideUser class="size-6 text-primary"></svg>
          Mon profil
        </h1>
        <p class="text-muted-foreground text-sm mt-1">
          @if (authService.mustChangePassword()) {
            Définissez votre nouveau mot de passe.
          } @else {
            Consultez vos informations personnelles, votre organisation et modifiez votre mot de passe.
          }
        </p>
      </div>

      @if (!authService.mustChangePassword()) {
        <div class="rounded-lg border bg-card p-6 max-w-xl space-y-4">
          <h2 class="text-sm font-semibold">Informations personnelles</h2>

          <div class="space-y-2">
            <label hlmLabel for="profile-email">Email</label>
            <input
              hlmInput
              id="profile-email"
              type="email"
              [value]="authService.userProfile()?.email ?? ''"
              disabled
              class="w-full"
            />
          </div>

          <form class="space-y-4" (ngSubmit)="saveDisplayName()">
            <div class="space-y-2">
              <label hlmLabel for="profile-name">Nom complet</label>
              <input
                hlmInput
                id="profile-name"
                type="text"
                [(ngModel)]="formDisplayName"
                name="formDisplayName"
                class="w-full"
              />
            </div>
            <button hlmBtn type="submit" [disabled]="profileService.saving()">
              {{ profileService.saving() ? 'Enregistrement…' : 'Enregistrer le nom' }}
            </button>
          </form>
        </div>

        <div class="rounded-lg border bg-card p-6 max-w-xl space-y-4">
          <h2 class="text-sm font-semibold flex items-center gap-2">
            <svg lucideBuilding2 class="size-4"></svg>
            Mon organisation
          </h2>

          @if (organizationsService.loading()) {
            <div class="space-y-3">
              <div hlmSkeleton class="h-6 w-48"></div>
              <div hlmSkeleton class="h-4 w-full"></div>
              <div hlmSkeleton class="h-4 w-2/3"></div>
            </div>
          } @else {
            @if (organizationsService.currentOrganization(); as organization) {
              <div class="space-y-4">
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
              <p class="text-sm text-muted-foreground">Aucune organisation associée à votre compte.</p>
            }
          }
        </div>
      }

      <div class="rounded-lg border bg-card p-6 max-w-xl space-y-4">
        <h2 class="text-sm font-semibold">Mot de passe</h2>

        <form class="space-y-4" (ngSubmit)="savePassword()">
          <div class="space-y-2">
            <label hlmLabel for="profile-password">Nouveau mot de passe</label>
            <input
              hlmInput
              id="profile-password"
              type="password"
              [(ngModel)]="formPassword"
              name="formPassword"
              required
              minlength="8"
              class="w-full"
            />
          </div>
          <div class="space-y-2">
            <label hlmLabel for="profile-password-confirm">Confirmer le mot de passe</label>
            <input
              hlmInput
              id="profile-password-confirm"
              type="password"
              [(ngModel)]="formPasswordConfirm"
              name="formPasswordConfirm"
              required
              minlength="8"
              class="w-full"
            />
          </div>
          <button hlmBtn type="submit" [disabled]="profileService.saving()">
            {{ profileService.saving() ? 'Enregistrement…' : 'Changer le mot de passe' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ProfilePage implements OnInit {
  readonly authService = inject(AuthService);
  readonly profileService = inject(ProfileService);
  readonly organizationsService = inject(OrganizationsService);
  private readonly router = inject(Router);

  formDisplayName = '';
  formPassword = '';
  formPasswordConfirm = '';

  ngOnInit() {
    this.syncDisplayName();
    if (!this.authService.mustChangePassword()) {
      this.loadOrganization();
    }
  }

  private syncDisplayName() {
    this.formDisplayName = this.authService.userProfile()?.display_name ?? '';
  }

  private async loadOrganization() {
    try {
      await this.organizationsService.loadCurrent();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      toast.error(message);
    }
  }

  async saveDisplayName() {
    try {
      await this.profileService.updateDisplayName(this.formDisplayName.trim());
      this.syncDisplayName();
      toast.success('Nom mis à jour.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour.';
      toast.error(message);
    }
  }

  async savePassword() {
    if (this.formPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (this.formPassword !== this.formPasswordConfirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await this.profileService.updatePassword(this.formPassword);
      this.formPassword = '';
      this.formPasswordConfirm = '';
      toast.success('Mot de passe mis à jour.');
      if (!this.authService.mustChangePassword()) {
        await this.loadOrganization();
        this.router.navigate(['/']);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe.';
      toast.error(message);
    }
  }
}
