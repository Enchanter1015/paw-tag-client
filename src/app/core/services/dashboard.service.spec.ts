import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { API_BASE_URL } from './api-config';
import { DashboardStats } from '../models/models';

describe('DashboardService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl }],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches dashboard stats', () => {
    const stats: DashboardStats = {
      totalAnimals: 10,
      vaccinatedAnimals: 6,
      vaccinationDueAnimals: 2,
      recentAnimals: [],
    };
    let result: DashboardStats | undefined;

    service.getStats().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/dashboard/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(stats);

    expect(result).toEqual(stats);
  });

  it('propagates a 403 for an actor without the dashboard:read permission', () => {
    let receivedError: unknown;

    service.getStats().subscribe({
      next: () => {
        throw new Error('expected an error');
      },
      error: (err) => (receivedError = err),
    });

    const req = httpMock.expectOne(`${baseUrl}/dashboard/stats`);
    req.flush(
      { error: { code: 'FORBIDDEN', message: 'Missing required permission: dashboard:read' } },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(receivedError).toBeTruthy();
  });
});
