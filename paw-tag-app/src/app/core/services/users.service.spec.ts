import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { API_BASE_URL } from './api-config';
import { CreateUserInput, UpdateUserInput, User } from '../models/models';

describe('UsersService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: UsersService;
  let httpMock: HttpTestingController;

  const user: User = {
    id: 'uuid-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
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
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registers a user', () => {
    const input: CreateUserInput = { name: 'Jane Doe', email: 'jane@example.com' };

    service.register(input).subscribe((result) => expect(result).toEqual(user));

    const req = httpMock.expectOne(`${baseUrl}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(user);
  });

  it('finds a user by email', () => {
    service.findByEmail('jane@example.com').subscribe((result) => expect(result).toEqual(user));

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/users` && r.params.get('email') === 'jane@example.com');
    expect(req.request.method).toBe('GET');
    req.flush(user);
  });

  it('gets a user by id', () => {
    service.getById('uuid-1').subscribe((result) => expect(result).toEqual(user));

    const req = httpMock.expectOne(`${baseUrl}/users/uuid-1`);
    expect(req.request.method).toBe('GET');
    req.flush(user);
  });

  it('updates a user', () => {
    const input: UpdateUserInput = { phoneNo: '5551234567' };

    service.update('uuid-1', input).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/uuid-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(input);
    req.flush({ ...user, phoneNo: '5551234567' });
  });

  it('propagates a duplicate email error', () => {
    let receivedError: unknown;

    service.register({ name: 'Dup', email: 'jane@example.com' }).subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/users`);
    req.flush({ error: { code: 'CONFLICT', message: 'Duplicate email' } }, { status: 409, statusText: 'Conflict' });

    expect(receivedError).toBeTruthy();
  });
});
