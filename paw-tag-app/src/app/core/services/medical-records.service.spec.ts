import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MedicalRecordsService } from './medical-records.service';
import { API_BASE_URL } from './api-config';
import { CreateVaccinationRecordInput, MedicalRecord, UpdateVaccinationRecordInput, VerifyMedicalRecordInput } from '../models/models';

describe('MedicalRecordsService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: MedicalRecordsService;
  let httpMock: HttpTestingController;

  const record: MedicalRecord = {
    id: 'uuid-record',
    medicalRecordTypeId: 1,
    title: 'Rabies vaccine',
    prescribedBy: 'uuid-vet',
    animalId: 'a1b2c3d4',
    administeredAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'uuid-creator',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    service = TestBed.inject(MedicalRecordsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds a vaccination record for an animal', () => {
    const input: CreateVaccinationRecordInput = { title: 'Rabies vaccine', medicalRecordTypeId: 1, prescribedBy: 'uuid-vet' };

    service.addForAnimal('a1b2c3d4', input).subscribe((result) => expect(result).toEqual(record));

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4/medical-records`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(record);
  });

  it('lists vaccination records for an animal', () => {
    service.listForAnimal('a1b2c3d4').subscribe((result) => expect(result).toEqual([record]));

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4/medical-records`);
    expect(req.request.method).toBe('GET');
    req.flush([record]);
  });

  it('gets a medical record by id', () => {
    service.getById('uuid-record').subscribe((result) => expect(result).toEqual(record));

    const req = httpMock.expectOne(`${baseUrl}/medical-records/uuid-record`);
    expect(req.request.method).toBe('GET');
    req.flush(record);
  });

  it('updates a medical record', () => {
    const input: UpdateVaccinationRecordInput = { title: 'Rabies booster' };

    service.update('uuid-record', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/medical-records/uuid-record`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...record, title: 'Rabies booster' });
  });

  it('verifies a medical record', () => {
    const input: VerifyMedicalRecordInput = { verifiedBy: 'uuid-vet' };

    service.verify('uuid-record', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/medical-records/uuid-record/verify`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...record, verifiedBy: 'uuid-vet' });
  });

  it('propagates a not found error', () => {
    let receivedError: unknown;

    service.getById('missing1').subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/medical-records/missing1`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404, statusText: 'Not Found' });

    expect(receivedError).toBeTruthy();
  });
});
