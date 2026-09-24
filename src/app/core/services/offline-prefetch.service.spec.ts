import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { API_BASE_URL } from './api-config';
import { OfflineCacheKeys, OfflineCacheService } from './offline-cache.service';
import { OfflinePrefetchService } from './offline-prefetch.service';
import { Animal, Lookup, MedicalRecord, User } from '../models/models';

describe('OfflinePrefetchService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: OfflinePrefetchService;
  let cache: OfflineCacheService;
  let httpMock: HttpTestingController;

  const animalTypes: Lookup[] = [{ id: 1, name: 'Dog' }];
  const medicalRecordTypes: Lookup[] = [{ id: 1, name: 'Vaccination' }];

  function makeAnimal(id: string, createdBy?: string): Animal {
    return { id, name: `Dog ${id}`, animalTypeId: 1, isStreet: true, createdBy, createdAt: '', updatedAt: '' };
  }

  function makeRecord(id: string, animalId: string, createdBy: string): MedicalRecord {
    return {
      id,
      medicalRecordTypeId: 1,
      title: `Record ${id}`,
      prescribedBy: createdBy,
      animalId,
      administeredAt: '2026-01-01T00:00:00Z',
      createdBy,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function makeUser(id: string): User {
    return { id, name: `User ${id}`, email: `${id}@example.com`, roleId: 1, isActive: true, updatedAt: '2026-01-01T00:00:00Z' };
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl }],
    });
    service = TestBed.inject(OfflinePrefetchService);
    cache = TestBed.inject(OfflineCacheService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
    localStorage.clear();
  });

  it('remembers each record from a list under its own detail key', () => {
    const records = [makeRecord('rec-1', 'a1', 'vet-1'), makeRecord('rec-2', 'a1', 'vet-1')];

    service.rememberMedicalRecords(records);

    expect(cache.get(OfflineCacheKeys.medicalRecord('rec-1'))?.data).toEqual(records[0]);
    expect(cache.get(OfflineCacheKeys.medicalRecord('rec-2'))?.data).toEqual(records[1]);
  });

  it('caches lookups, each animal, its record list, every record and each author once', () => {
    let completed = false;

    service.prefetchAnimals(['a1', 'a2']).subscribe({ complete: () => (completed = true) });

    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/a1`).flush(makeAnimal('a1', 'owner-1'));
    httpMock.expectOne(`${baseUrl}/animals/a2`).flush(makeAnimal('a2', 'owner-1'));
    httpMock
      .expectOne(`${baseUrl}/animals/a1/medical-records`)
      .flush([makeRecord('rec-1', 'a1', 'vet-1'), makeRecord('rec-2', 'a1', 'vet-1')]);
    httpMock.expectOne(`${baseUrl}/animals/a2/medical-records`).flush([makeRecord('rec-3', 'a2', 'vet-2')]);
    // Each author is fetched only once, even though owner-1 and vet-1 appear more than once.
    httpMock.expectOne(`${baseUrl}/users/owner-1`).flush(makeUser('owner-1'));
    httpMock.expectOne(`${baseUrl}/users/vet-1`).flush(makeUser('vet-1'));
    httpMock.expectOne(`${baseUrl}/users/vet-2`).flush(makeUser('vet-2'));

    expect(completed).toBe(true);
    expect(cache.get(OfflineCacheKeys.animalTypes)?.data).toEqual(animalTypes);
    expect(cache.get(OfflineCacheKeys.medicalRecordTypes)?.data).toEqual(medicalRecordTypes);
    expect(cache.get<Animal>(OfflineCacheKeys.animal('a1'))?.data.name).toBe('Dog a1');
    expect(cache.get<Animal>(OfflineCacheKeys.animal('a2'))?.data.name).toBe('Dog a2');
    expect(cache.get<MedicalRecord[]>(OfflineCacheKeys.animalMedicalRecords('a1'))?.data.length).toBe(2);
    expect(cache.get<MedicalRecord>(OfflineCacheKeys.medicalRecord('rec-3'))?.data.title).toBe('Record rec-3');
    expect(cache.get<User>(OfflineCacheKeys.user('owner-1'))?.data.name).toBe('User owner-1');
    expect(cache.get<User>(OfflineCacheKeys.user('vet-2'))?.data.name).toBe('User vet-2');
  });

  it('skips the owner lookup for an animal with no createdBy', () => {
    service.prefetchAnimals(['a1']).subscribe();

    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/a1`).flush(makeAnimal('a1'));
    httpMock.expectOne(`${baseUrl}/animals/a1/medical-records`).flush([]);

    expect(cache.get(OfflineCacheKeys.animal('a1'))).not.toBeNull();
  });

  it('ignores individual failures and still caches everything else', () => {
    let error: unknown;
    let completed = false;

    service.prefetchAnimals(['a1', 'a2']).subscribe({ error: (e) => (error = e), complete: () => (completed = true) });

    httpMock.expectOne(`${baseUrl}/animal-types`).flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/a1`).flush(null, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${baseUrl}/animals/a2`).flush(makeAnimal('a2'));
    httpMock.expectOne(`${baseUrl}/animals/a1/medical-records`).flush([makeRecord('rec-1', 'a1', 'vet-1')]);
    httpMock.expectOne(`${baseUrl}/animals/a2/medical-records`).flush([]);
    httpMock.expectOne(`${baseUrl}/users/vet-1`).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(error).toBeUndefined();
    expect(completed).toBe(true);
    expect(cache.get(OfflineCacheKeys.animalTypes)).toBeNull();
    expect(cache.get(OfflineCacheKeys.animal('a1'))).toBeNull();
    expect(cache.get(OfflineCacheKeys.animal('a2'))).not.toBeNull();
    expect(cache.get(OfflineCacheKeys.medicalRecord('rec-1'))).not.toBeNull();
    expect(cache.get(OfflineCacheKeys.user('vet-1'))).toBeNull();
  });

  it('sends no requests when there are no animals', () => {
    let completed = false;

    service.prefetchAnimals([]).subscribe({ complete: () => (completed = true) });

    expect(completed).toBe(true);
    httpMock.expectNone(() => true);
  });

  it('sends no requests while offline', () => {
    window.dispatchEvent(new Event('offline'));
    let completed = false;

    service.prefetchAnimals(['a1']).subscribe({ complete: () => (completed = true) });

    expect(completed).toBe(true);
    httpMock.expectNone(() => true);
  });
});
