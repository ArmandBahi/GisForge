import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideMenu } from '@lucide/angular';
import { AuthService } from '@app/core/auth/auth.service';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmSkeletonImports } from '@app/shared/ui/skeleton';
import { AppSidebarComponent } from './app-sidebar.component';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    LucideMenu,
    HlmButtonImports,
    HlmSkeletonImports,
    AppSidebarComponent,
  ],
  template: `
    @if (authService.loading()) {
      <div class="min-h-screen flex items-center justify-center bg-background">
        <div class="space-y-4 w-64">
          <div hlmSkeleton class="h-8 w-48"></div>
          <div hlmSkeleton class="h-4 w-full"></div>
          <div hlmSkeleton class="h-4 w-3/4"></div>
        </div>
      </div>
    } @else {
      <div class="flex min-h-screen w-full bg-background">
        @if (sidebarOpen()) {
          <div
            class="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
            (click)="sidebarOpen.set(false)"
          ></div>
        }

        <app-sidebar
          class="fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0 transition-transform"
          [class.-translate-x-full]="!sidebarOpen()"
          [class.translate-x-0]="sidebarOpen()"
          (navigate)="sidebarOpen.set(false)"
        />

        <div class="flex flex-1 flex-col min-w-0">
          <header class="flex h-14 items-center gap-4 border-b bg-card px-4 shrink-0">
            <button
              hlmBtn
              variant="ghost"
              size="icon"
              class="lg:hidden"
              type="button"
              (click)="sidebarOpen.set(true)"
            >
              <svg lucideMenu class="size-5"></svg>
            </button>
            <div class="flex-1"></div>
          </header>
          <main class="flex-1 overflow-auto p-6">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  readonly sidebarOpen = signal(false);
}
