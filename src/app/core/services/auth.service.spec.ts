import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { API_BASE_URL } from './api-config';
import { OfflineCacheService } from './offline-cache.service';
import { LoginInput, LogoutInput, RefreshInput, RegisterInput, TokenPair } from '../models/models';

describe('AuthService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  const tokenPair: TokenPair = { accessToken: 'access-1', refreshToken: 'refresh-1' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('registers a user and stores the returned tokens', () => {
    const input: RegisterInput = { name: 'Jane Doe', email: 'jane@example.com', password: 'password1' };

    service.register(input).subscribe((result) => expect(result).toEqual(tokenPair));

    const req = httpMock.expectOne(`${baseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(tokenPair);

    expect(tokenStorage.getAccessToken()).toBe('access-1');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-1');
  });

  it('logs in a user and stores the returned tokens', () => {
    const input: LoginInput = { email: 'jane@example.com', password: 'password1' };

    service.login(input).subscribe((result) => expect(result).toEqual(tokenPair));

    const req = httpMock.expectOne(`${baseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(tokenPair);

    expect(tokenStorage.getAccessToken()).toBe('access-1');
  });

  it('refreshes tokens and stores the rotated pair', () => {
    const input: RefreshInput = { refreshToken: 'old-refresh' };
    const rotated: TokenPair = { accessToken: 'access-2', refreshToken: 'refresh-2' };

    service.refresh(input).subscribe((result) => expect(result).toEqual(rotated));

    const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush(rotated);

    expect(tokenStorage.getAccessToken()).toBe('access-2');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-2');
  });

  it('logs out and clears stored tokens', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    const input: LogoutInput = { refreshToken: 'refresh-1' };

    service.logout(input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('clears cached offline profiles on logout', () => {
    const offlineCache = TestBed.inject(OfflineCacheService);
    offlineCache.set('animal:1', { name: 'Rex' });

    service.logout({ refreshToken: 'refresh-1' }).subscribe();
    httpMock.expectOne(`${baseUrl}/auth/logout`).flush(null);

    expect(offlineCache.get('animal:1')).toBeNull();
  });

  it('keeps cached offline profiles when logout fails', () => {
    const offlineCache = TestBed.inject(OfflineCacheService);
    offlineCache.set('animal:1', { name: 'Rex' });

    service.logout({ refreshToken: 'refresh-1' }).subscribe({ error: () => undefined });
    httpMock.expectOne(`${baseUrl}/auth/logout`).flush(null, { status: 500, statusText: 'Server Error' });

    expect(offlineCache.get('animal:1')).not.toBeNull();
    offlineCache.clear();
  });

  it('propagates an error response without storing tokens', () => {
    const input: LoginInput = { email: 'jane@example.com', password: 'wrong' };
    let receivedError: unknown;

    service.login(input).subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/auth/login`);
    req.flush({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeTruthy();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
