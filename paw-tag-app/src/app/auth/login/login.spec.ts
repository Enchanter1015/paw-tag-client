import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Login } from './login';
import { API_BASE_URL } from '../../core/services/api-config';

describe('Login', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: '', component: Login }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs in with valid credentials and redirects to the dashboard by default', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    component.form.setValue({ email: 'jane@example.com', password: 'password1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/auth/login`);
    expect(req.request.body).toEqual({ email: 'jane@example.com', password: 'password1' });
    req.flush({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    expect(component.submitting()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('redirects to the redirectTo query param after login when present', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: 'login', component: Login }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    await router.navigateByUrl('/login?redirectTo=%2Fanimals');
    navigateSpy.mockClear();

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({ email: 'jane@example.com', password: 'password1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/auth/login`);
    req.flush({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    expect(navigateSpy).toHaveBeenCalledWith('/animals');
  });

  it('shows an inline error for a 401 invalid-credentials response', () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({ email: 'jane@example.com', password: 'wrong' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/auth/login`);
    req.flush(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component.submitting()).toBe(false);
    expect(component.formError()).toBe('Incorrect email or password.');
  });
});
