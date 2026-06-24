import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideLayers } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@app/core/auth/auth.service';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';

type AuthMode = 'signin' | 'reset';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideLayers,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background p-4">
      <div class="w-full max-w-md space-y-8">
        <div class="text-center space-y-2">
          <div class="inline-flex items-center justify-center size-16 rounded-xl bg-primary/10 text-primary mb-2">
            <svg lucideLayers class="size-8"></svg>
          </div>
          <h1 class="text-3xl font-bold tracking-tight">GisForge</h1>
          <p class="text-muted-foreground text-sm">Forge your own GIS</p>
        </div>

        <div class="rounded-lg border bg-card p-6 shadow-sm">
          <div class="flex border-b mb-6">
            <button
              type="button"
              (click)="setMode('signin')"
              [class]="
                mode() === 'signin'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              class="flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors"
            >
              Connexion
            </button>
          </div>

          <form (ngSubmit)="handleSubmit()" class="space-y-4">
            <div class="space-y-2">
              <label hlmLabel for="email">Adresse email</label>
              <input
                hlmInput
                id="email"
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="vous@example.com"
                required
                class="w-full"
              />
            </div>

            @if (mode() !== 'reset') {
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <label hlmLabel for="password">Mot de passe</label>
                  @if (mode() === 'signin') {
                    <button
                      type="button"
                      (click)="setMode('reset')"
                      class="text-xs text-primary hover:underline font-medium"
                    >
                      Mot de passe oublié ?
                    </button>
                  }
                </div>
                <input
                  hlmInput
                  id="password"
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  class="w-full"
                />
              </div>
            }

            <button
              hlmBtn
              type="submit"
              class="w-full"
              [disabled]="isLoading() || authService.loading()"
            >
              {{ getButtonText() }}
            </button>
          </form>

          @if (mode() === 'reset') {
            <div class="mt-4 text-center">
              <button
                type="button"
                (click)="setMode('signin')"
                class="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour à la connexion
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class LoginPage implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<AuthMode>('signin');
  readonly isLoading = signal(false);

  email = '';
  password = '';

  ngOnInit() {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error === 'organization_inactive') {
      toast.error(
        "L'organisation associée à votre compte est inactive. L'accès à l'application est refusé.",
      );
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { error: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  setMode(newMode: AuthMode) {
    this.mode.set(newMode);
  }

  getButtonText(): string {
    switch (this.mode()) {
      case 'signin':
        return this.isLoading() ? 'Connexion…' : 'Se connecter';
      case 'reset':
        return this.isLoading() ? 'Envoi…' : 'Envoyer le lien de réinitialisation';
    }
  }

  async handleSubmit() {
    if (!this.email) {
      toast.error('Veuillez renseigner votre email.');
      return;
    }

    if (this.mode() !== 'reset' && !this.password) {
      toast.error('Veuillez renseigner votre mot de passe.');
      return;
    }

    this.isLoading.set(true);
    try {
      if (this.mode() === 'signin') {
        await this.authService.signIn(this.email, this.password);
        toast.success('Connexion réussie !');
        if (this.authService.mustChangePassword()) {
          toast.info('Vous devez changer votre mot de passe pour continuer.');
          this.router.navigate(['/my-profile']);
        } else {
          this.router.navigate(['/']);
        }
      } else {
        await this.authService.resetPassword(this.email);
        toast.success('Un email de réinitialisation vous a été envoyé.');
        this.setMode('signin');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      toast.error(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
