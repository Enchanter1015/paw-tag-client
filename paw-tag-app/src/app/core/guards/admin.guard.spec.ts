import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthStateService } from '../services/auth-state.service';

describe('adminGuard', () => {
  let router: Router;
  let authState: { isAdministrator: () => boolean; isAuthenticated: () => boolean };

  beforeEach(() => {
    authState = { isAdministrator: () => false, isAuthenticated: () => false };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStateService, useValue: authState }]
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation for an administrator', () => {
    authState.isAdministrator = () => true;
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/animals' } as any)
    );

    expect(result).toBe(true);
  });

  it('redirects a logged-in non-admin to /', () => {
    authState.isAdministrator = () => false;
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/animals' } as any)
    ) as UrlTree;

    expect(result.toString()).toBe('/');
  });

  it('redirects an unauthenticated user to /login with the attempted url', () => {
    authState.isAdministrator = () => false;
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/animals' } as any)
    ) as UrlTree;

    expect(result.toString()).toContain('/login');
    expect(result.toString()).toContain('redirectTo');
  });
});
