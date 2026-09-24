import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalRecordView } from './medical-record-view';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, Lookup, MedicalRecord, User } from '../../core/models/models';
import { OfflineCacheKeys, OfflineCacheService } from '../../core/services/offline-cache.service';

describe('MedicalRecordView', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalId = 'abcd1234';
  const recordId = 'rec-1';

  const animal: Animal = {
    id: animalId,
    name: 'Kalu',
    animalTypeId: 1,
    isStreet: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const medicalRecordTypes: Lookup[] = [{ id: 1, name: 'Wound treatment' }];

  const record: MedicalRecord = {
    id: recordId,
    medicalRecordTypeId: 1,
    title: 'Wound treatment — left hind leg',
    description: 'Cleaned and dressed a laceration.',
    prescribedBy: 'vet-1',
    animalId,
    administeredAt: '2026-02-28T00:00:00Z',
    createdBy: 'user-1',
    createdAt: '2026-02-28T16:12:00Z',
    updatedAt: '2026-02-28T16:12:00Z',
  };

  const recordedByUser: User = {
    id: 'user-1',
    name: 'N. Silva',
    email: 'n.silva@example.com',
    roleId: 1,
    isActive: true,
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;
  let authState: { isGuest: () => boolean };

  function createComponent() {
    const fixture = TestBed.createComponent(MedicalRecordView);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animalId}`).flush(animal);
    httpMock.expectOne(`${baseUrl}/medical-records/${recordId}`).flush(record);
    httpMock.expectOne(`${baseUrl}/users/${record.createdBy}`).flush(recordedByUser);
    fixture.detectChanges();
    return fixture;
  }

  const networkDown = () => new ProgressEvent('error');

  // The connectivity service may be created after the event fires, so stub navigator.onLine too —
  // mirroring a real device that is already offline when the page opens.
  function goOffline() {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
  }

  // Opens the record with no connectivity; `withAuthor` expects the recorder lookup that only
  // happens once a (cached) record is available.
  function createOfflineComponent(withAuthor = true) {
    goOffline();
    const fixture = TestBed.createComponent(MedicalRecordView);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).error(networkDown());
    httpMock.expectOne(`${baseUrl}/animals/${animalId}`).error(networkDown());
    httpMock.expectOne(`${baseUrl}/medical-records/${recordId}`).error(networkDown());
    if (withAuthor) {
      httpMock.expectOne(`${baseUrl}/users/${record.createdBy}`).error(networkDown());
    }
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    localStorage.clear();
    authState = { isGuest: () => true };
    TestBed.configureTestingModule({
      imports: [MedicalRecordView],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthStateService, useValue: authState },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: animalId, recordId }) } },
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

  it('shows the record type, title, description and who logged it', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Wound treatment');
    expect(fixture.nativeElement.textContent).toContain('Wound treatment — left hind leg');
    expect(fixture.nativeElement.textContent).toContain('Cleaned and dressed a laceration.');
    expect(fixture.nativeElement.textContent).toContain('N. Silva');
    expect(fixture.nativeElement.textContent).toContain('Kalu');
    expect(fixture.nativeElement.textContent).toContain(animalId);
  });

  it('sets the page header to a plain "Medical record" title with a back chevron', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Medical record');
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
  });

  it('shows a not-found message when the record does not exist', () => {
    const fixture = TestBed.createComponent(MedicalRecordView);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animalId}`).flush(animal);

    const req = httpMock.expectOne(`${baseUrl}/medical-records/${recordId}`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Record not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Medical record not found.');
  });

  it('falls back to "Unknown" when the recording user cannot be resolved', () => {
    const fixture = TestBed.createComponent(MedicalRecordView);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animalId}`).flush(animal);
    httpMock.expectOne(`${baseUrl}/medical-records/${recordId}`).flush(record);

    const userReq = httpMock.expectOne(`${baseUrl}/users/${record.createdBy}`);
    userReq.flush({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unknown');
  });

  it('uploads photos and appends them to the record for an authenticated user', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.uploadPhotos({ target: input } as unknown as Event);

    const req = httpMock.expectOne(`${baseUrl}/medical-records/${recordId}/images`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const newImage = {
      id: 'img-1',
      medicalRecordId: recordId,
      s3Key: 'k',
      url: 'http://example.com/1.webp',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    req.flush([newImage]);

    expect(component.uploadingPhotos()).toBe(false);
    expect(component.record()?.images).toEqual([newImage]);
  });

  it('hides the upload control for a guest', () => {
    const fixture = createComponent();

    const label = fixture.nativeElement.querySelector('.record-view-upload-label');
    expect(label).toBeNull();
  });
  describe('offline', () => {
    it('serves a previously viewed record with its type, animal and recorder from the cache', () => {
      createComponent().destroy();

      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;

      expect(component.notFound()).toBe(false);
      expect(component.record()).toEqual(record);
      expect(component.medicalRecordTypeName()).toBe('Wound treatment');
      expect(component.animal()?.name).toBe('Kalu');
      expect(component.recordedByName()).toBe('N. Silva');
      expect(fixture.nativeElement.querySelector('.pt-offline-notice').textContent).toContain(
        'Showing details saved on this device on'
      );
    });

    it('opens a record that was only ever seen in a list, falling back to "Unknown" for the recorder', () => {
      TestBed.inject(OfflineCacheService).set(OfflineCacheKeys.medicalRecord(recordId), record);

      const fixture = createOfflineComponent();

      expect(fixture.componentInstance.record()?.title).toBe(record.title);
      expect(fixture.nativeElement.textContent).toContain('Unknown');
    });

    it('explains that the record is not saved on the device when offline with no cached copy', () => {
      const fixture = createOfflineComponent(false);

      expect(fixture.componentInstance.notFound()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain("hasn't been saved on this device yet");
      expect(fixture.nativeElement.textContent).not.toContain('Medical record not found.');
    });

    it('blocks photo uploads without sending a request', () => {
      authState.isGuest = () => false;
      createComponent().destroy();
      const fixture = createOfflineComponent();
      const component = fixture.componentInstance;

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
      component.uploadPhotos({ target: input } as unknown as Event);

      httpMock.expectNone(`${baseUrl}/medical-records/${recordId}/images`);
      expect(component.photoError()).toBe("You're offline. Adding photos needs an internet connection.");
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.disabled).toBe(true);
    });
  });
});
