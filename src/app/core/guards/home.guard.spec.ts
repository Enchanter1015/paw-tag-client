import { TestBed } from '@angular/core/testing';
import { homeGuard } from './home.guard';
import { AuthStateService } from '../services/auth-state.service';

describe('homeGuard', () => {
  let authState: { isAuthenticated: () => boolean };

  beforeEach(() => {
    authState = { isAuthenticated: () => false };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthStateService, useValue: authState }],
    });
  });

  it('allows matching on web when user is unauthenticated', () => {
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, [], {} as any));
    expect(result).toBe(true);
  });

  it('rejects matching on web when user is authenticated', () => {
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, [], {} as any));
    expect(result).toBe(false);
  });

  it('allows matching on cordova build when unauthenticated', () => {
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, [], {} as any));
    expect(result).toBe(true);
  });

  it('rejects matching on cordova build when authenticated', () => {
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, [], {} as any));
    expect(result).toBe(false);
  });
});
