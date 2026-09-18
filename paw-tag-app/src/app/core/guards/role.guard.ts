import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

// Restricts a route to one of the given roles; unauthenticated/unauthorised users are redirected
export function roleGuard(allowedRoles: string[]): CanMatchFn {
  return () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    const user = authState.currentUser;
    if (user?.role && allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(user ? ['/'] : ['/login']);
  };
}
