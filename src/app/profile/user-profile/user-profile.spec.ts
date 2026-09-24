import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserProfile } from './user-profile';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { Animal, MedicalRecord, User } from '../../core/models/models';
import { OfflineCacheKeys, OfflineCacheService } from '../../core/services/offline-cache.service';

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

  const vaccination: MedicalRecord = {
    id: 'rec-1',
    medicalRecordTypeId: 1,
    title: 'Rabies vaccination',
    prescribedBy: 'vet-1',
    animalId: 'a1111111',
    administeredAt: '2026-01-01T00:00:00Z',
    createdBy: 'vet-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const networkDown = () => new ProgressEvent('error');

  // The connectivity service may be created after the event fires, so stub navigator.onLine too —
  // mirroring a real device that is already offline when the page opens.
  function goOffline() {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
  }

  // Answers the background prefetch that caches "My animals" (only Bruno belongs to this account).
  function flushPrefetch() {
    httpMock.expectOne(`${baseUrl}/animal-types`).flush([{ id: 1, name: 'Dog' }]);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush([{ id: 1, name: 'Vaccination' }]);
    httpMock.expectOne(`${baseUrl}/animals/a1111111`).flush({ ...animals[0], createdBy: sub });
    httpMock.expectOne(`${baseUrl}/animals/a1111111/medical-records`).flush([vaccination]);
    httpMock.expectOne(`${baseUrl}/users/${sub}`).flush({ ...user, id: sub });
    httpMock.expectOne(`${baseUrl}/users/vet-1`).flush({ ...user, id: 'vet-1', name: 'Dr. Perera' });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/users/${sub}`).flush({ ...user, id: sub });
    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).flush(
      animals.map((a) => (a.createdBy === '' ? { ...a, createdBy: sub } : a))
    );
    flushPrefetch();
    fixture.detectChanges();
    return fixture;
  }

  function createOfflineComponent() {
    goOffline();
    const fixture = TestBed.createComponent(UserProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/users/${sub}`).error(networkDown());
    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).error(networkDown());
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
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
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
  it('shows a sign-out error instead of failing silently', () => {
    const fixture = createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    fixture.componentInstance.signOut();
    httpMock
      .expectOne(`${baseUrl}/auth/logout`)
      .flush({ error: { code: 'OFFLINE', message: "You're offline. Connect to the internet and try again." } }, { status: 0, statusText: 'Offline' });
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain("You're offline");
  });

  describe('offline', () => {
    it('prefetches every one of my animals, their record lists, each record and its author while online', () => {
      createComponent();
      const cache = TestBed.inject(OfflineCacheService);

      expect(cache.get<Animal[]>(OfflineCacheKeys.myAnimals(sub))?.data.map((a) => a.id)).toEqual(['a1111111']);
      expect(cache.get(OfflineCacheKeys.animal('a1111111'))).not.toBeNull();
      expect(cache.get<MedicalRecord[]>(OfflineCacheKeys.animalMedicalRecords('a1111111'))?.data).toEqual([vaccination]);
      expect(cache.get<MedicalRecord>(OfflineCacheKeys.medicalRecord('rec-1'))?.data).toEqual(vaccination);
      expect(cache.get<User>(OfflineCacheKeys.user('vet-1'))?.data.name).toBe('Dr. Perera');
      expect(cache.get(OfflineCacheKeys.medicalRecordTypes)).not.toBeNull();
    });

    it('shows the cached profile and animals when offline, without prefetching', () => {
      createComponent().destroy();

      const fixture = createOfflineComponent();

      expect(fixture.componentInstance.user()?.name).toBe('Nadeesha Silva');
      expect(fixture.componentInstance.myAnimals().map((a) => a.id)).toEqual(['a1111111']);
      expect(fixture.componentInstance.cachedAt()).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Bruno');
      expect(fixture.nativeElement.querySelector('.pt-offline-notice').textContent).toContain(
        'Showing details saved on this device on'
      );
    });

    it('explains that the profile is not saved on the device when offline with no cached copy', () => {
      const fixture = createOfflineComponent();

      expect(fixture.componentInstance.loadError()).toContain("You're offline and your profile hasn't been saved");
      expect(fixture.nativeElement.textContent).toContain("hasn't been saved on this device yet");
    });

    it('does not show the offline notice for live data', () => {
      const fixture = createComponent();

      expect(fixture.componentInstance.cachedAt()).toBeNull();
      expect(fixture.nativeElement.querySelector('.pt-offline-notice')).toBeNull();
    });
  });
});
