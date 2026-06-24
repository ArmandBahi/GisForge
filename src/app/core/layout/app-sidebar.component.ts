import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideFolder,
  LucideLayoutDashboard,
  LucideLayers,
  LucideLogOut,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@app/core/auth/auth.service';
import { HlmButtonImports } from '@app/shared/ui/button';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideFolder,
    LucideLayoutDashboard,
    LucideLayers,
    LucideLogOut,
    LucideUsers,
    LucideX,
    HlmButtonImports,
  ],
  host: {
    class:
      'flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
  },
  template: `
    <div class="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
      <div class="flex items-center gap-2">
        <svg lucideLayers class="size-5 text-sidebar-foreground"></svg>
        <span class="text-sm font-semibold">GisForge</span>
      </div>
      <button
        hlmBtn
        variant="ghost"
        size="icon"
        class="lg:hidden text-sidebar-foreground"
        type="button"
        (click)="navigate.emit()"
      >
        <svg lucideX class="size-5"></svg>
      </button>
    </div>

    <nav class="flex-1 space-y-1 p-3">
      <a
        routerLink="/"
        routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground"
        [routerLinkActiveOptions]="{ exact: true }"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        (click)="navigate.emit()"
      >
        <svg lucideLayoutDashboard class="size-4"></svg>
        Dashboard
      </a>
      @if (authService.hasRole('super_admin') || authService.hasRole('organization_admin')) {
        <a
          routerLink="/users"
          routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          (click)="navigate.emit()"
        >
          <svg lucideUsers class="size-4"></svg>
          Utilisateurs
        </a>
        <a
          routerLink="/groups"
          routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          (click)="navigate.emit()"
        >
          <svg lucideFolder class="size-4"></svg>
          Groupes
        </a>
      }
    </nav>

    <div class="border-t border-sidebar-border p-3">
      <div class="mb-2 truncate px-3 text-xs text-sidebar-foreground/70">
        {{ displayName() }}
      </div>
      <button
        hlmBtn
        variant="ghost"
        class="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
        type="button"
        [disabled]="authService.loading()"
        (click)="onSignOut()"
      >
        <svg lucideLogOut class="size-4"></svg>
        Déconnexion
      </button>
    </div>
  `,
})
export class AppSidebarComponent {
  readonly authService = inject(AuthService);
  readonly navigate = output<void>();

  displayName(): string {
    const profile = this.authService.userProfile();
    if (profile?.display_name) {
      return profile.display_name;
    }
    if (profile?.email) {
      return profile.email;
    }
    return this.authService.user()?.email ?? '—';
  }

  async onSignOut() {
    try {
      await this.authService.signOut();
      toast.success('Déconnexion réussie.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la déconnexion.';
      toast.error(message);
    }
  }
}
