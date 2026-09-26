import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { PlatformService } from '../services/platform.service';

/**
 * Matches the public standalone Home route on root ("") only when running
 * in a web browser and the user is unauthenticated.
 *
 * In Cordova mobile builds or when the web user is already signed in,
 * it returns false so the router falls through to AppShell and Dashboard (gated by authGuard).
 */
export const homeGuard: CanMatchFn = () => {
  const platform = inject(PlatformService);
  const authState = inject(AuthStateService);

  return platform.isWeb() && !authState.isAuthenticated();
};
