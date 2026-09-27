import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

/**
 * Matches the public standalone Home route on root ("") whenever the user
 * is unauthenticated, on both web and Cordova mobile builds.
 *
 * When the user is already signed in, it returns false so the router falls
 * through to AppShell and Dashboard (gated by authGuard).
 */
export const homeGuard: CanMatchFn = () => {
  const authState = inject(AuthStateService);

  return !authState.isAuthenticated();
};
