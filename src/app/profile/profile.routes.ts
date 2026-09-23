import { Routes } from '@angular/router';
import { UserProfile } from './user-profile/user-profile';
import { authGuard } from '../core/guards/auth.guard';

export const profileRoutes: Routes = [{ path: 'profile', component: UserProfile, canActivate: [authGuard] }];
