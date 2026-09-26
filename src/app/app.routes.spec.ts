import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthStateService } from './core/services/auth-state.service';
import { PlatformService } from './core/services/platform.service';
import { Home } from './home/home';
import { Dashboard } from './dashboard/dashboard';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from './core/services/api-config';

describe('App routing for root path ("/") across platforms', () => {
  let router: Router;
  let authState: { isAuthenticated: () => boolean; isGuest: () => boolean; isAdministrator: () => boolean; hasRole: () => boolean };
  let platform: { isWeb: () => boolean; isCordova: () => boolean };

  function setup(isWeb: boolean, isAuthenticated: boolean) {
    authState = {
      isAuthenticated: () => isAuthenticated,
      isGuest: () => !isAuthenticated,
      isAdministrator: () => false,
      hasRole: () => false,
    };
    platform = {
      isWeb: () => isWeb,
      isCordova: () => !isWeb,
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        { provide: AuthStateService, useValue: authState },
        { provide: PlatformService, useValue: platform },
      ],
    });

    router = TestBed.inject(Router);
  }

  it('routes unauthenticated web users on "/" to the Home page', async () => {
    setup(true, false);
    await router.navigateByUrl('/');

    // Check that top level route component is Home
    const matched = router.routerState.snapshot.root.firstChild;
    expect(matched?.component).toBe(Home);
    expect(router.url).toBe('/');
  });

  it('routes authenticated web users on "/" to the Dashboard inside AppShell', async () => {
    setup(true, true);
    await router.navigateByUrl('/');

    const matchedChild = router.routerState.snapshot.root.firstChild?.firstChild;
    expect(matchedChild?.component).toBe(Dashboard);
    expect(router.url).toBe('/');
  });

  it('redirects unauthenticated Cordova users on "/" to /login with redirectTo="/"', async () => {
    setup(false, false);
    await router.navigateByUrl('/');

    expect(router.url).toContain('/login');
    expect(router.url).toContain('redirectTo');
  });

  it('routes authenticated Cordova users on "/" to the Dashboard', async () => {
    setup(false, true);
    await router.navigateByUrl('/');

    const matchedChild = router.routerState.snapshot.root.firstChild?.firstChild;
    expect(matchedChild?.component).toBe(Dashboard);
    expect(router.url).toBe('/');
  });
});
