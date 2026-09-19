import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppShell } from './app-shell';
import { AuthStateService } from '../core/services/auth-state.service';
import { TokenStorageService } from '../core/services/token-storage.service';
import { API_BASE_URL } from '../core/services/api-config';

function makeToken(role = 'Administrator'): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = { sub: 'user-1', role, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

describe('AppShell', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('hides the sign-out button when logged out', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeNull();
  });

  it('shows the sign-out button, logs out and navigates to /login when logged in', () => {
    const tokenStorage = TestBed.inject(TokenStorageService);
    const authState = TestBed.inject(AuthStateService);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    tokenStorage.setTokens(makeToken(), 'refresh-1');
    authState.refresh();

    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button).toBeTruthy();

    button.click();

    const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
    req.flush(null);

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('hides login-only nav items and the admin section for a guest', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.pt-nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent
    );
    expect(links).toEqual(['Home', 'Animals', 'Scan']);
    expect(fixture.nativeElement.querySelector('.pt-admin-nav')).toBeNull();
  });

  it('shows Records and Profile but not the admin section for a registered user', () => {
    const tokenStorage = TestBed.inject(TokenStorageService);
    const authState = TestBed.inject(AuthStateService);
    tokenStorage.setTokens(makeToken('User'), 'refresh-1');
    authState.refresh();

    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.pt-nav a')).map(
      (a) => (a as HTMLAnchorElement).textContent
    );
    expect(links).toEqual(['Home', 'Animals', 'Scan', 'Records', 'Profile']);
    expect(fixture.nativeElement.querySelector('.pt-admin-nav')).toBeNull();
  });

  it('shows the admin section for an administrator regardless of exact role casing', () => {
    const tokenStorage = TestBed.inject(TokenStorageService);
    const authState = TestBed.inject(AuthStateService);
    tokenStorage.setTokens(makeToken('admin'), 'refresh-1');
    authState.refresh();

    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const adminNav = fixture.nativeElement.querySelector('.pt-admin-nav');
    expect(adminNav).toBeTruthy();
    const adminLinks = Array.from(adminNav.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).textContent);
    expect(adminLinks).toEqual(['User management', 'Record verification']);
  });
});
