import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserProfile } from './user-profile';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { Animal, User } from '../../core/models/models';

function makeToken(role = 'User'): { token: string; sub: string } {
  const sub = 'user-1111-2222-3333-444444444444';
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = { sub, role, exp: Math.floor(Date.now() / 1000) + 3600 };
  return { token: `${encode({ alg: 'none' })}.${encode(payload)}.signature`, sub };
}

describe('UserProfile', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let httpMock: HttpTestingController;
  let sub: string;

  const user: User = {
    id: '',
    name: 'Nadeesha Silva',
    email: 'nadeesha.silva@example.com',
    phoneNo: '077 456 1234',
    roleId: 1,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const animals: Animal[] = [
    { id: 'a1111111', name: 'Bruno', animalTypeId: 1, isStreet: false, createdBy: '', createdAt: '', updatedAt: '' },
    { id: 'a2222222', name: 'Stray', animalTypeId: 1, isStreet: true, createdBy: 'someone-else', createdAt: '', updatedAt: '' },
  ];

  function createComponent() {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/users/${sub}`).flush({ ...user, id: sub });
    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).flush(
      animals.map((a) => (a.createdBy === '' ? { ...a, createdBy: sub } : a))
    );
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UserProfile],
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);

    const tokenStorage = TestBed.inject(TokenStorageService);
    const authState = TestBed.inject(AuthStateService);
    const { token, sub: userSub } = makeToken('User');
    sub = userSub;
    tokenStorage.setTokens(token, 'refresh-1');
    authState.refresh();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("shows the user's identity, role tag and contact details", () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Nadeesha Silva');
    expect(fixture.nativeElement.textContent).toContain('nadeesha.silva@example.com');
    expect(fixture.nativeElement.textContent).toContain('User');
    expect(fixture.nativeElement.textContent).toContain('077 456 1234');
  });

  it('lists only the animals this account registered', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance.myAnimals().map((a) => a.id)).toEqual(['a1111111']);
    expect(fixture.nativeElement.textContent).toContain('Bruno');
    expect(fixture.nativeElement.textContent).not.toContain('Stray');
  });

  it('shows an empty state when the account has no registered animals', () => {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/users/${sub}`).flush({ ...user, id: sub });
    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No animals registered yet.');
  });

  it('signs out and navigates to /login', () => {
    const fixture = createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    fixture.componentInstance.signOut();

    const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
