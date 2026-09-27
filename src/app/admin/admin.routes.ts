import { Routes } from '@angular/router';
import { AnimalRecordsAdmin } from './animal-records-admin/animal-records-admin';
import { OrganizationDetail } from './organization-detail/organization-detail';
import { OrganizationsAdmin } from './organizations-admin/organizations-admin';
import { UserManagement } from './user-management/user-management';
import { adminGuard } from '../core/guards/admin.guard';
import { authGuard } from '../core/guards/auth.guard';

// Static paths must come before the dynamic ':id' route, otherwise it would swallow them.
export const adminRoutes: Routes = [
  { path: 'admin/animals', component: AnimalRecordsAdmin, canActivate: [adminGuard] },
  { path: 'admin/users', component: UserManagement, canActivate: [adminGuard] },
  { path: 'admin/organizations', component: OrganizationsAdmin, canActivate: [adminGuard] },
  // Any signed-in org member can view their organization; edit/add-member controls are gated
  // inside the component itself so a non-admin member gets a read-only view.
  { path: 'admin/organizations/:id', component: OrganizationDetail, canActivate: [authGuard] },
];
