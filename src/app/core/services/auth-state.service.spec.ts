import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { TokenStorageService } from './token-storage.service';

function makeToken(payload: object, expired = false): string {
  const header = { alg: 'none', typ: 'JWT' };
  const body = { ...payload, exp: expired ? Math.floor(Date.now() / 1000) - 60 : Math.floor(Date.now() / 1000) + 3600 };
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode(header)}.${encode(body)}.signature`;
}

describe('AuthStateService', () => {
  let service: AuthStateService;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStateService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    window.dispatchEvent(new Event('online'));
    localStorage.clear();
  });

  it('reports no user when no token is stored', () => {
    expect(service.currentUser).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isGuest()).toBe(true);
  });

  it('decodes the current user from a valid access token after refresh()', () => {
    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'Administrator' }), 'refresh-1');

    service.refresh();

    expect(service.currentUser).toEqual(expect.objectContaining({ sub: 'user-1', role: 'Administrator' }));
    expect(service.isAuthenticated()).toBe(true);
    expect(service.hasRole('Administrator')).toBe(true);
    expect(service.hasRole('Vet')).toBe(false);
  });

  it('treats an expired token as unauthenticated', () => {
    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'Administrator' }, true), 'refresh-1');

    service.refresh();

    expect(service.currentUser).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('keeps an expired session usable while offline so cached data stays reachable', () => {
    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'User' }, true), 'refresh-1');
    window.dispatchEvent(new Event('offline'));

    service.refresh();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser?.sub).toBe('user-1');
  });

  it('drops the expired session again once back online', () => {
    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'User' }, true), 'refresh-1');
    window.dispatchEvent(new Event('offline'));
    service.refresh();

    window.dispatchEvent(new Event('online'));
    service.refresh();

    expect(service.isAuthenticated()).toBe(false);
  });

  it('treats any role containing "admin" (case-insensitive) as an administrator', () => {
    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'admin' }), 'refresh-1');
    service.refresh();
    expect(service.isAdministrator()).toBe(true);

    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'Admin' }), 'refresh-1');
    service.refresh();
    expect(service.isAdministrator()).toBe(true);

    tokenStorage.setTokens(makeToken({ sub: 'user-1', role: 'doctor' }), 'refresh-1');
    service.refresh();
    expect(service.isAdministrator()).toBe(false);
  });

  it('is not an administrator when logged out', () => {
    expect(service.isAdministrator()).toBe(false);
  });
});
