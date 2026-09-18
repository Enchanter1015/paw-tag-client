import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStateService } from '../services/auth-state.service';

describe('authGuard', () => {
  let router: Router;
  let authState: { isAuthenticated: () => boolean };

  beforeEach(() => {
    authState = { isAuthenticated: () => false };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStateService, useValue: authState }]
    });

    router = TestBed.inject(Router);
  });

  it('allows navigation when authenticated', () => {
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/animals' } as any)
    );

    expect(result).toBe(true);
  });

  it('redirects to /login with the attempted url when unauthenticated', () => {
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/animals' } as any)
    ) as UrlTree;

    expect(result.toString()).toContain('/login');
    expect(result.toString()).toContain('redirectTo');
  });
});
