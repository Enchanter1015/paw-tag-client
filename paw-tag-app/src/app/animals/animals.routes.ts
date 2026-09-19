import { Routes } from '@angular/router';
import { AnimalRegister } from './animal-register/animal-register';
import { AnimalSearch } from './animal-search/animal-search';
import { AnimalProfile } from './animal-profile/animal-profile';
import { authGuard } from '../core/guards/auth.guard';

// Static paths must come before the dynamic ':id' route, otherwise it would swallow them.
export const animalsRoutes: Routes = [
  { path: 'animals', component: AnimalSearch },
  { path: 'animals/register', component: AnimalRegister, canActivate: [authGuard] },
  { path: 'animals/:id', component: AnimalProfile },
];
