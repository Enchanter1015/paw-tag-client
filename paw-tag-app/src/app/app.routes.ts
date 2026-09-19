import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AppShell } from './shell/app-shell';
import { authGuard } from './core/guards/auth.guard';
import { authRoutes } from './auth/auth.routes';

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [{ path: '', component: Dashboard }],
  },
];

