import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnimalsService } from './animals.service';
import { API_BASE_URL } from './api-config';
import { Animal, CreateAnimalInput, MergeAnimalInput, UpdateAnimalInput } from '../models/models';

describe('AnimalsService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: AnimalsService;
  let httpMock: HttpTestingController;

  const animal: Animal = {
    id: 'a1b2c3d4',
    name: 'Rex',
    animalTypeId: 1,
    isStreet: false,
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
    service = TestBed.inject(AnimalsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registers an animal', () => {
    const input: CreateAnimalInput = { name: 'Rex', animalTypeId: 1 };

    service.register(input).subscribe((result) => expect(result).toEqual(animal));

    const req = httpMock.expectOne(`${baseUrl}/animals`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(animal);
  });

  it('searches animals without params', () => {
    service.search().subscribe((result) => expect(result).toEqual([animal]));

    const req = httpMock.expectOne(`${baseUrl}/animals`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([animal]);
  });

  it('searches animals with query params', () => {
    service.search({ query: 'Rex', animalTypeId: 1, isStreet: true }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/animals` && r.params.get('query') === 'Rex' && r.params.get('animalTypeId') === '1' && r.params.get('isStreet') === 'true'
    );
    req.flush([animal]);
  });

  it('gets an animal by id', () => {
    service.getById('a1b2c3d4').subscribe((result) => expect(result).toEqual(animal));

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4`);
    expect(req.request.method).toBe('GET');
    req.flush(animal);
  });

  it('updates an animal', () => {
    const input: UpdateAnimalInput = { name: 'Rex Updated' };

    service.update('a1b2c3d4', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...animal, name: 'Rex Updated' });
  });

  it('removes an animal', () => {
    service.remove('a1b2c3d4').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('merges an animal into a target', () => {
    const input: MergeAnimalInput = { targetId: 'z9y8x7w6' };

    service.merge('a1b2c3d4', input).subscribe((result) => expect(result).toEqual(animal));

    const req = httpMock.expectOne(`${baseUrl}/animals/a1b2c3d4/merge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(animal);
  });

  it('propagates a 404 error', () => {
    let receivedError: unknown;

    service.getById('unknown1').subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/animals/unknown1`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });

    expect(receivedError).toBeTruthy();
  });
});
