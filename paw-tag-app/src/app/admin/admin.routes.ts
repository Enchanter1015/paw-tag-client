import { Routes } from '@angular/router';
import { AnimalRecordsAdmin } from './animal-records-admin/animal-records-admin';
import { UserManagement } from './user-management/user-management';
import { adminGuard } from '../core/guards/admin.guard';

export const adminRoutes: Routes = [
  { path: 'admin/animals', component: AnimalRecordsAdmin, canActivate: [adminGuard] },
  { path: 'admin/users', component: UserManagement, canActivate: [adminGuard] },
];
