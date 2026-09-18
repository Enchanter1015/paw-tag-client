import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthStateService } from '../services/auth-state.service';
import { AuthUser } from '../models/models';

describe('roleGuard', () => {
  let authState: { currentUser: AuthUser | null };

  beforeEach(() => {
    authState = { currentUser: null };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStateService, useValue: authState }]
    });
  });

  it('allows navigation when the user has an allowed role', () => {
    authState.currentUser = { sub: 'user-1', role: 'Administrator' };

    const result = TestBed.runInInjectionContext(() => roleGuard(['Administrator'])({} as any, [] as any, {} as any));

    expect(result).toBe(true);
  });

  it('redirects to home when the user has a different role', () => {
    authState.currentUser = { sub: 'user-1', role: 'Guest' };

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['Administrator'])({} as any, [] as any, {} as any)
    ) as UrlTree;

    expect(result.toString()).toBe('/');
  });

  it('redirects to /login when unauthenticated', () => {
    authState.currentUser = null;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['Administrator'])({} as any, [] as any, {} as any)
    ) as UrlTree;

    expect(result.toString()).toBe('/login');
  });
});
