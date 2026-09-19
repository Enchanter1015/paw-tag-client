import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalRecordView } from './medical-record-view';
import { API_BASE_URL } from '../../core/services/api-config';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, Lookup, MedicalRecord, User } from '../../core/models/models';

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
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicalRecordView],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: animalId, recordId }) } },
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

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
});
