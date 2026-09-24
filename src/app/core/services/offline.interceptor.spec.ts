import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OFFLINE_ERROR_CODE, OFFLINE_ERROR_MESSAGE, offlineInterceptor } from './offline.interceptor';
import { ApiError } from '../models/models';

describe('offlineInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  // The connectivity service may be created lazily by the first request, so stub navigator.onLine
  // as well as firing the event — mirroring a real device that is already offline.
  function goOffline() {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([offlineInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
    httpMock.verify();
  });

  it('lets write requests through while online', () => {
    http.post('/animals', { name: 'Rex' }).subscribe();

    const req = httpMock.expectOne('/animals');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Rex' });
    req.flush({});
  });

  it('lets read requests through while offline so cached responses can answer them', () => {
    goOffline();

    http.get('/animals/1').subscribe();

    const req = httpMock.expectOne('/animals/1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('fails %s immediately with an offline ApiError while offline', (method) => {
    goOffline();
    let receivedError: HttpErrorResponse | undefined;

    http.request(method, '/animals/1', { body: {} }).subscribe({
      next: () => {
        throw new Error('expected an error');
      },
      error: (err: HttpErrorResponse) => (receivedError = err),
    });

    httpMock.expectNone('/animals/1');
    expect(receivedError?.status).toBe(0);
    const body = receivedError?.error as ApiError;
    expect(body.error.code).toBe(OFFLINE_ERROR_CODE);
    expect(body.error.message).toBe(OFFLINE_ERROR_MESSAGE);
  });
});
