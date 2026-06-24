import { Routes } from '@angular/router';

export const GROUPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./groups.page').then((m) => m.GroupsPage),
  },
];
