import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/app-layout.component').then((m) => m.AppLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'users',
        canActivate: [roleGuard(['super_admin', 'organization_admin'])],
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'groups',
        canActivate: [roleGuard(['super_admin', 'organization_admin'])],
        loadChildren: () => import('./features/groups/groups.routes').then((m) => m.GROUPS_ROUTES),
      },
      {
        path: 'organizations',
        canActivate: [roleGuard(['super_admin'])],
        loadChildren: () =>
          import('./features/organizations/organizations.routes').then((m) => m.ORGANIZATIONS_ROUTES),
      },
      {
        path: 'my-organization',
        loadComponent: () =>
          import('./features/organizations/my-organization.page').then((m) => m.MyOrganizationPage),
      },
      {
        path: 'my-profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
