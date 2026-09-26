import { TestBed } from '@angular/core/testing';
import { homeGuard } from './home.guard';
import { AuthStateService } from '../services/auth-state.service';
import { PlatformService } from '../services/platform.service';

describe('homeGuard', () => {
  let authState: { isAuthenticated: () => boolean };
  let platform: { isWeb: () => boolean; isCordova: () => boolean };

  beforeEach(() => {
    authState = { isAuthenticated: () => false };
    platform = { isWeb: () => true, isCordova: () => false };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStateService, useValue: authState },
        { provide: PlatformService, useValue: platform },
      ],
    });
  });

  it('allows matching on web when user is unauthenticated', () => {
    platform.isWeb = () => true;
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, []));
    expect(result).toBe(true);
  });

  it('rejects matching on web when user is authenticated', () => {
    platform.isWeb = () => true;
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, []));
    expect(result).toBe(false);
  });

  it('rejects matching on cordova build even if unauthenticated', () => {
    platform.isWeb = () => false;
    authState.isAuthenticated = () => false;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, []));
    expect(result).toBe(false);
  });

  it('rejects matching on cordova build when authenticated', () => {
    platform.isWeb = () => false;
    authState.isAuthenticated = () => true;

    const result = TestBed.runInInjectionContext(() => homeGuard({} as any, []));
    expect(result).toBe(false);
  });
});
