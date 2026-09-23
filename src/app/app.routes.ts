import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AppShell } from './shell/app-shell';
import { authGuard } from './core/guards/auth.guard';
import { authRoutes } from './auth/auth.routes';
import { animalsRoutes } from './animals/animals.routes';
import { adminRoutes } from './admin/admin.routes';
import { medicalRoutes } from './medical/medical.routes';
import { scanRoutes } from './scan/scan.routes';
import { profileRoutes } from './profile/profile.routes';

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', component: Dashboard, canActivate: [authGuard] },
      ...animalsRoutes,
      ...adminRoutes,
      ...medicalRoutes,
      ...scanRoutes,
      ...profileRoutes,
    ],
  },
];

