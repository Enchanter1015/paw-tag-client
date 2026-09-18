import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HealthService } from './health.service';
import { API_BASE_URL } from './api-config';

describe('HealthService', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  let service: HealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl }
      ]
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('checks liveness', () => {
    service.checkLive().subscribe((result) => expect(result).toEqual({ status: 'ok' }));

    const req = httpMock.expectOne(`${baseUrl}/health`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ok' });
  });

  it('checks readiness', () => {
    service.checkReady().subscribe((result) => expect(result).toEqual({ status: 'ready' }));

    const req = httpMock.expectOne(`${baseUrl}/health/ready`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'ready' });
  });

  it('propagates a 503 when not ready', () => {
    let receivedError: unknown;

    service.checkReady().subscribe({
      next: () => { throw new Error('expected an error'); },
      error: (err) => (receivedError = err)
    });

    const req = httpMock.expectOne(`${baseUrl}/health/ready`);
    req.flush({ status: 'not ready' }, { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError).toBeTruthy();
  });
});
