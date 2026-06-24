import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideUser } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@app/core/auth/auth.service';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideUser,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
          <svg lucideUser class="size-6 text-primary"></svg>
          Mon profil
        </h1>
        <p class="text-muted-foreground text-sm mt-1">
          Modifiez vos informations personnelles et votre mot de passe.
        </p>
      </div>

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
        <h2 class="text-sm font-semibold">Mot de passe</h2>

        @if (authService.userProfile()?.must_change_password) {
          <p class="text-sm text-amber-600 dark:text-amber-400">
            Vous devez changer votre mot de passe avant de continuer.
          </p>
        }

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

  formDisplayName = '';
  formPassword = '';
  formPasswordConfirm = '';

  ngOnInit() {
    this.syncDisplayName();
  }

  private syncDisplayName() {
    this.formDisplayName = this.authService.userProfile()?.display_name ?? '';
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe.';
      toast.error(message);
    }
  }
}
