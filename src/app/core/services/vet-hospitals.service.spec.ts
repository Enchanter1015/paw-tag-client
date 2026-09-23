import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VetHospitalsService } from './vet-hospitals.service';
import { API_BASE_URL } from './api-config';
import {
  AddVetHospitalMemberInput,
  CreateVetHospitalInput,
  UpdateVetHospitalInput,
  UpdateVetHospitalMemberInput,
  VetHospital,
  VetHospitalMember
} from '../models/models';

describe('VetHospitalsService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: VetHospitalsService;
  let httpMock: HttpTestingController;

  const hospital: VetHospital = {
    id: 'uuid-1',
    name: 'Central Vet Clinic',
    vetHospitalTypeId: 1,
    isVerified: false,
    isArchived: false,
    createdBy: 'uuid-owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  const member: VetHospitalMember = {
    id: 'uuid-member',
    vetHospitalId: 'uuid-1',
    userId: 'uuid-user',
    roleId: 1,
    joinedAt: '2026-01-01T00:00:00.000Z',
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
    service = TestBed.inject(VetHospitalsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registers a vet hospital', () => {
    const input: CreateVetHospitalInput = { name: 'Central Vet Clinic', vetHospitalTypeId: 1 };

    service.register(input).subscribe((result) => expect(result).toEqual(hospital));

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals`);
    expect(req.request.method).toBe('POST');
    req.flush(hospital);
  });

  it('searches vet hospitals without a name filter', () => {
    service.search().subscribe((result) => expect(result).toEqual([hospital]));

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([hospital]);
  });

  it('searches vet hospitals with a name filter', () => {
    service.search('Central').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/vet-hospitals` && r.params.get('name') === 'Central');
    req.flush([hospital]);
  });

  it('gets a vet hospital by id', () => {
    service.getById('uuid-1').subscribe((result) => expect(result).toEqual(hospital));

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1`);
    expect(req.request.method).toBe('GET');
    req.flush(hospital);
  });

  it('updates a vet hospital', () => {
    const input: UpdateVetHospitalInput = { isVerified: true };

    service.update('uuid-1', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...hospital, isVerified: true });
  });

  it('archives a vet hospital', () => {
    service.archive('uuid-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('adds a member', () => {
    const input: AddVetHospitalMemberInput = { userId: 'uuid-user', roleId: 1 };

    service.addMember('uuid-1', input).subscribe((result) => expect(result).toEqual(member));

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(member);
  });

  it('lists members', () => {
    service.listMembers('uuid-1').subscribe((result) => expect(result).toEqual([member]));

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1/members`);
    expect(req.request.method).toBe('GET');
    req.flush([member]);
  });

  it('updates a member role', () => {
    const input: UpdateVetHospitalMemberInput = { roleId: 2 };

    service.updateMember('uuid-1', 'uuid-member', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1/members/uuid-member`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...member, roleId: 2 });
  });

  it('removes a member', () => {
    service.removeMember('uuid-1', 'uuid-member').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1/members/uuid-member`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates a duplicate member error', () => {
    let receivedError: unknown;

    service.addMember('uuid-1', { userId: 'uuid-user', roleId: 1 }).subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/vet-hospitals/uuid-1/members`);
    req.flush({ error: { code: 'CONFLICT', message: 'User is already a member' } }, { status: 409, statusText: 'Conflict' });

    expect(receivedError).toBeTruthy();
  });
});
