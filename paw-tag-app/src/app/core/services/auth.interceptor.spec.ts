import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from './token-storage.service';
import { AuthStateService } from './auth-state.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;
  let authState: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds an Authorization header when an access token is present', () => {
    tokenStorage.setTokens('token-123', 'refresh-123');

    http.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({});
  });

  it('does not add an Authorization header when no token is stored', () => {
    http.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('clears the session and redirects to /login on a 401 from a non-auth endpoint', async () => {
    tokenStorage.setTokens('token-123', 'refresh-123');
    await router.navigateByUrl('/animals/123');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const refreshSpy = vi.spyOn(authState, 'refresh');
    let receivedError: unknown;

    http.get('/animals/123').subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne('/animals/123');
    req.flush({ error: { code: 'UNAUTHORIZED', message: 'Token expired' } }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeTruthy();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(refreshSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
    const navigatedTree = navigateSpy.mock.calls[0][0].toString();
    expect(navigatedTree).toContain('/login');
    expect(navigatedTree).toContain('redirectTo');
  });

  it('does not intercept a 401 from the login endpoint itself', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    let receivedError: unknown;

    http.post('/auth/login', {}).subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne('/auth/login');
    req.flush({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
