import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { AppRole } from './auth.types';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/']);
};

export const roleGuard = (allowedRoles: AppRole[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.whenReady();

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const hasRole = allowedRoles.some((role) => authService.hasRole(role));
    if (hasRole) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};
