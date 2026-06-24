import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { AppRole } from './auth.types';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.canAccessApp()) {
    await authService.signOut();
    return router.createUrlTree(['/login'], { queryParams: { error: 'organization_inactive' } });
  }

  return true;
};

export const passwordChangeChildGuard: CanActivateChildFn = async (_, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (authService.mustChangePassword() && !state.url.startsWith('/my-profile')) {
    return router.createUrlTree(['/my-profile']);
  }

  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (authService.isAuthenticated() && authService.canAccessApp()) {
    const target = authService.mustChangePassword() ? '/my-profile' : '/';
    return router.createUrlTree([target]);
  }

  return true;
};

export const roleGuard = (allowedRoles: AppRole[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.whenReady();

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (!authService.canAccessApp()) {
      await authService.signOut();
      return router.createUrlTree(['/login'], { queryParams: { error: 'organization_inactive' } });
    }

    const hasRole = allowedRoles.some((role) => authService.hasRole(role));
    if (hasRole) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};
