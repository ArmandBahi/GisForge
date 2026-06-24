import { Routes } from '@angular/router';

export const ORGANIZATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./organizations.page').then((m) => m.OrganizationsPage),
  },
];
