import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalProfile } from './animal-profile';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, Lookup, MedicalRecord } from '../../core/models/models';

describe('AnimalProfile', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalTypes: Lookup[] = [{ id: 1, name: 'Dog' }];
  const animal: Animal = {
    id: 'abcd1234',
    name: 'Rex',
    animalTypeId: 1,
    breed: 'Labrador',
    isStreet: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const medicalRecordTypes: Lookup[] = [
    { id: 1, name: 'Vaccination' },
    { id: 2, name: 'Wound treatment' },
  ];

  let httpMock: HttpTestingController;
  let authState: { isGuest: () => boolean };

  function createComponent(medicalRecords: MedicalRecord[] = []) {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(animal);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush(medicalRecords);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    localStorage.clear();
    authState = { isGuest: () => true };
    TestBed.configureTestingModule({
      imports: [AnimalProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthStateService, useValue: authState },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: animal.id }) } },
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
    localStorage.clear();
  });

  it('shows a read-only view with a QR code link but no edit button for a guest', () => {
    const fixture = createComponent();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('pt-button'));
    expect(buttons.some((b) => b.textContent?.includes('Edit animal'))).toBe(false);
    expect(buttons.some((b) => b.textContent?.includes('View QR code'))).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Rex');
    expect(fixture.nativeElement.textContent).not.toContain('Add medical record');
  });

  it('shows an edit button for an authenticated user and lets them edit', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.startEditing();
    fixture.detectChanges();

    expect(component.editing()).toBe(true);
    expect(component.form.controls.name.value).toBe('Rex');

    component.form.controls.name.setValue('Rex Updated');
    component.save();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Rex Updated', animalTypeId: 1, breed: 'Labrador', isStreet: false });

    req.flush({ ...animal, name: 'Rex Updated' });

    expect(component.saving()).toBe(false);
    expect(component.editing()).toBe(false);
    expect(component.animal()?.name).toBe('Rex Updated');
  });

  it('shows an "Add medical record" action for an authenticated user near the animal details', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('pt-button'));
    expect(buttons.some((b) => b.textContent?.includes('Add medical record'))).toBe(true);
  });

  it('points the header at an edit action once an authenticated user\'s animal has loaded', () => {
    authState.isGuest = () => false;
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Rex');
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
    expect(pageHeader.config().action?.kind).toBe('edit');
  });

  it('omits the header edit action for a guest', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().action).toBeUndefined();
  });

  it('switches the header to a close+save action while editing, then back to edit after saving', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const pageHeader = TestBed.inject(PageHeaderService);

    component.startEditing();
    fixture.detectChanges();

    expect(pageHeader.config().left.kind).toBe('close');
    expect(pageHeader.config().title()).toBe('Edit Rex');
    expect(pageHeader.config().action?.kind).toBe('save');

    component.form.controls.name.setValue('Rex Updated');
    component.save();
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush({ ...animal, name: 'Rex Updated' });

    expect(pageHeader.config().left).toEqual({ kind: 'back' });
    expect(pageHeader.config().title()).toBe('Rex Updated');
    expect(pageHeader.config().action?.kind).toBe('edit');
  });

  it('resolves and shows who registered the animal', () => {
    const registeredAnimal: Animal = { ...animal, createdBy: 'user-1' };
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(registeredAnimal);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);
    httpMock.expectOne(`${baseUrl}/users/user-1`).flush({
      id: 'user-1',
      name: 'A. Fernando',
      email: 'a.fernando@example.com',
      phoneNo: '0771234567',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Registered by A. Fernando');
    expect(fixture.nativeElement.textContent).toContain('0771234567');
  });

  it('shows "Not recorded" for the owner contact number when none is on file', () => {
    const registeredAnimal: Animal = { ...animal, createdBy: 'user-1' };
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(registeredAnimal);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);
    httpMock.expectOne(`${baseUrl}/users/user-1`).flush({
      id: 'user-1',
      name: 'A. Fernando',
      email: 'a.fernando@example.com',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    fixture.detectChanges();

    const contactRow = Array.from(fixture.nativeElement.querySelectorAll('dt')).find(
      (dt) => (dt as HTMLElement).textContent === 'Contact number'
    ) as HTMLElement;
    expect(contactRow.nextElementSibling?.textContent).toBe('Not recorded');
  });

  it('shows a not-found message when the animal does not exist', () => {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.notFound()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal not found');
  });

  function makeRecord(overrides: Partial<MedicalRecord>): MedicalRecord {
    return {
      id: 'rec-1',
      medicalRecordTypeId: 1,
      title: 'Record',
      prescribedBy: 'vet-1',
      animalId: animal.id,
      administeredAt: '2026-01-01T00:00:00Z',
      createdBy: 'vet-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  it('shows only the 5 most recently administered medical records, with a link to view all', () => {
    const records = Array.from({ length: 7 }, (_, i) =>
      makeRecord({ id: `rec-${i}`, administeredAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    const fixture = createComponent(records);
    const component = fixture.componentInstance;

    expect(component.recentMedicalRecords().length).toBe(5);
    expect(component.recentMedicalRecords()[0].id).toBe('rec-6');

    const link = fixture.nativeElement.querySelector('a.animal-profile-link');
    expect(link.textContent).toContain('View all');
    expect(link.getAttribute('href')).toBe(`/animals/${animal.id}/medical-records`);

    const recordLink = fixture.nativeElement.querySelector('a.medical-record-link') as HTMLAnchorElement;
    expect(recordLink.getAttribute('href')).toBe(`/animals/${animal.id}/medical-records/rec-6`);
  });

  it('shows only the most recent record per vaccine type in the vaccinations list', () => {
    const olderRabies = makeRecord({
      id: 'rec-rabies-old',
      medicalRecordTypeId: 1,
      administeredAt: '2025-01-01T00:00:00Z',
    });
    const newerRabies = makeRecord({
      id: 'rec-rabies-new',
      medicalRecordTypeId: 1,
      administeredAt: '2026-01-01T00:00:00Z',
    });
    const nonVaccine = makeRecord({
      id: 'rec-wound',
      medicalRecordTypeId: 2,
      administeredAt: '2026-06-01T00:00:00Z',
    });
    const fixture = createComponent([olderRabies, newerRabies, nonVaccine]);

    expect(fixture.componentInstance.vaccinations().map((r) => r.id)).toEqual(['rec-rabies-new']);
  });

  it('tags a vaccination due within 30 days as "Due soon" and one due later as "Up to date"', () => {
    const dueSoonDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const records = [makeRecord({ id: 'rec-rabies', medicalRecordTypeId: 1, nextDueDate: dueSoonDate })];
    const fixture = createComponent(records);

    const status = fixture.componentInstance.medicalRecordDueStatus(records[0]);
    expect(status?.variant).toBe('warning');
    expect(status?.label).toBe('Due soon');
  });

  it('uploads photos and appends them to the animal', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.uploadPhotos({ target: input } as unknown as Event);

    expect(component.uploadingPhotos()).toBe(true);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const newImage = { id: 'img-1', animalId: animal.id, s3Key: 'k', url: 'http://example.com/1.webp', createdBy: 'u1', createdAt: '2026-01-01T00:00:00Z' };
    req.flush([newImage]);

    expect(component.uploadingPhotos()).toBe(false);
    expect(component.animal()?.images).toEqual([newImage]);
  });

  it('shows an error when photo upload fails', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.uploadPhotos({ target: input } as unknown as Event);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}/images`);
    req.flush({ error: { code: 'BAD_REQUEST', message: 'Invalid image' } }, { status: 400, statusText: 'Bad Request' });

    expect(component.uploadingPhotos()).toBe(false);
    expect(component.photoError()).toBe('Invalid image');
  });
  describe('offline', () => {
    const networkDown = () => new ProgressEvent('error');

    // Simulates reopening the profile with no connectivity: every request fails at the network level.
    function createOfflineComponent() {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
      const fixture = TestBed.createComponent(AnimalProfile);
      fixture.detectChanges();
      httpMock.expectOne(`${baseUrl}/animal-types`).error(networkDown());
      httpMock.expectOne(`${baseUrl}/medical-record-types`).error(networkDown());
      httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).error(networkDown());
      httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).error(networkDown());
      fixture.detectChanges();
      return fixture;
    }

    it('serves a previously viewed profile from the device cache when offline', () => {
      const records = [makeRecord({ id: 'rec-rabies', title: 'Rabies booster' })];
      createComponent(records).destroy();

      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;

      expect(component.notFound()).toBe(false);
      expect(component.animal()).toEqual(animal);
      expect(component.animalTypes()).toEqual(animalTypes);
      expect(component.medicalRecords().map((r) => r.id)).toEqual(['rec-rabies']);
      expect(component.cachedAt()).not.toBeNull();

      const notice = fixture.nativeElement.querySelector('.pt-offline-notice') as HTMLElement;
      expect(notice.textContent).toContain('Showing details saved on this device on');
      expect(notice.textContent).toContain('need an internet connection');
      expect(fixture.nativeElement.textContent).toContain('Rabies booster');
    });

    it('serves the cached owner when offline', () => {
      const registeredAnimal: Animal = { ...animal, createdBy: 'user-1' };
      const first = TestBed.createComponent(AnimalProfile);
      first.detectChanges();
      httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
      httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
      httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(registeredAnimal);
      httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);
      httpMock
        .expectOne(`${baseUrl}/users/user-1`)
        .flush({ id: 'user-1', name: 'A. Fernando', email: 'a@example.com', updatedAt: '2026-01-01T00:00:00Z' });
      first.destroy();

      const fixture = createOfflineComponent();
      httpMock.expectOne(`${baseUrl}/users/user-1`).error(networkDown());
      fixture.detectChanges();

      expect(fixture.componentInstance.owner()?.name).toBe('A. Fernando');
    });

    it('explains that the profile is not saved on the device when offline with no cached copy', () => {
      const fixture = createOfflineComponent();

      expect(fixture.componentInstance.notFound()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain("hasn't been saved on this device yet");
      expect(fixture.nativeElement.textContent).not.toContain('Animal not found');
    });

    it('does not show the offline notice for a live profile while online', () => {
      const fixture = createComponent();

      expect(fixture.componentInstance.cachedAt()).toBeNull();
      expect(fixture.nativeElement.querySelector('.pt-offline-notice')).toBeNull();
    });

    it('still reports not found for a 404 while online, even if a cached copy exists', () => {
      createComponent().destroy();

      const fixture = TestBed.createComponent(AnimalProfile);
      fixture.detectChanges();
      httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
      httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
      httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);
      httpMock
        .expectOne(`${baseUrl}/animals/${animal.id}`)
        .flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });

      expect(fixture.componentInstance.notFound()).toBe(true);
    });

    it('blocks editing with an explicit offline message', () => {
      authState.isGuest = () => false;
      createComponent().destroy();
      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;

      component.startEditing();
      fixture.detectChanges();

      expect(component.editing()).toBe(false);
      expect(component.offlineNotice()).toBe("You're offline. Editing needs an internet connection.");
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        'Editing needs an internet connection'
      );
    });

    it('clears the offline edit message once editing starts after reconnecting', () => {
      authState.isGuest = () => false;
      createComponent().destroy();
      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;
      component.startEditing();

      window.dispatchEvent(new Event('online'));
      component.startEditing();

      expect(component.editing()).toBe(true);
      expect(component.offlineNotice()).toBeNull();
    });

    it('blocks photo uploads without sending a request', () => {
      authState.isGuest = () => false;
      createComponent().destroy();
      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
      component.uploadPhotos({ target: input } as unknown as Event);

      httpMock.expectNone(`${baseUrl}/animals/${animal.id}/images`);
      expect(component.uploadingPhotos()).toBe(false);
      expect(component.photoError()).toBe("You're offline. Adding photos needs an internet connection.");
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.disabled).toBe(true);
    });

    it('disables the "Add medical record" action', () => {
      authState.isGuest = () => false;
      createComponent().destroy();
      const fixture = createOfflineComponent();

      const addButton = Array.from(fixture.nativeElement.querySelectorAll('pt-button')).find((b) =>
        (b as HTMLElement).textContent?.includes('Add medical record')
      ) as HTMLElement;
      expect(addButton.querySelector('button')?.disabled).toBe(true);
    });
  });
});
