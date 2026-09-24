import { Routes } from '@angular/router';
import { authGuard } from './core/auth';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage), title: 'Sign in · Curxx Admin' },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell').then((m) => m.Shell),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage), title: 'Dashboard · Curxx Admin' },
      { path: ':resource', loadComponent: () => import('./pages/resource-list').then((m) => m.ResourceListPage) },
      { path: ':resource/new', loadComponent: () => import('./pages/resource-form').then((m) => m.ResourceFormPage) },
      { path: ':resource/:key', loadComponent: () => import('./pages/resource-form').then((m) => m.ResourceFormPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
