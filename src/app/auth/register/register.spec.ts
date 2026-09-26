import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Register } from './register';
import { API_BASE_URL } from '../../core/services/api-config';

describe('Register', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([
          { path: '', component: Register },
          { path: 'login', component: Register },
        ]),
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

  it('does not submit and shows validation errors when the form is invalid', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.submit();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.nameError()).toBe('Enter your name.');
    expect(component.emailError()).toBe('Enter your email address.');
    expect(component.passwordError()).toBe('Enter a password.');
  });

  it('registers a valid user and navigates to the dashboard', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    component.form.setValue({ name: 'Jane Doe', email: 'jane@example.com', password: 'password1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/auth/register`);
    expect(req.request.body).toEqual({ name: 'Jane Doe', email: 'jane@example.com', password: 'password1' });
    req.flush({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    expect(component.submitting()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('maps a 409 duplicate-email response to an inline field error', () => {
    const fixture = TestBed.createComponent(Register);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({ name: 'Jane Doe', email: 'jane@example.com', password: 'password1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/auth/register`);
    req.flush(
      { error: { code: 'CONFLICT', message: 'Email already exists' } },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.submitting()).toBe(false);
    expect(component.emailError()).toBe('This email is already registered.');
  });

  it('navigates to the home page when clicking the back button', async () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const backLink = fixture.nativeElement.querySelector('.auth-back-link') as HTMLAnchorElement;
    expect(backLink).toBeTruthy();
    expect(backLink.getAttribute('routerLink') ?? backLink.getAttribute('href')).toBe('/');

    backLink.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/');
  });
});
