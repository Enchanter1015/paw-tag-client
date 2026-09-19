import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

// Restricts a route to administrators (see AuthStateService.isAdministrator for the case-insensitive
// role match this relies on); unauthenticated users go to /login, everyone else to /.
export const adminGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAdministrator()) {
    return true;
  }

  if (!authState.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
  }

  return router.createUrlTree(['/']);
};
