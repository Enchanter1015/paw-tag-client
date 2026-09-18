import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LookupsService } from './lookups.service';
import { API_BASE_URL } from './api-config';
import { Lookup } from '../models/models';

describe('LookupsService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: LookupsService;
  let httpMock: HttpTestingController;

  const lookups: Lookup[] = [{ id: 1, name: 'Dog' }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    service = TestBed.inject(LookupsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists animal types', () => {
    service.getAnimalTypes().subscribe((result) => expect(result).toEqual(lookups));
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(lookups);
  });

  it('lists medical record types', () => {
    service.getMedicalRecordTypes().subscribe((result) => expect(result).toEqual(lookups));
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(lookups);
  });

  it('lists vet hospital types', () => {
    service.getVetHospitalTypes().subscribe((result) => expect(result).toEqual(lookups));
    httpMock.expectOne(`${baseUrl}/vet-hospital-types`).flush(lookups);
  });

  it('lists roles', () => {
    service.getRoles().subscribe((result) => expect(result).toEqual(lookups));
    httpMock.expectOne(`${baseUrl}/roles`).flush(lookups);
  });
});
