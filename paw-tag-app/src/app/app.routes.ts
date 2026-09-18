import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AppShell } from './shell/app-shell';
import { LoginPlaceholder } from './auth/login-placeholder';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPlaceholder },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [{ path: '', component: Dashboard }],
  },
];

