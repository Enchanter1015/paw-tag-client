import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { CachedResult, OfflineCacheService } from './offline-cache.service';

describe('OfflineCacheService', () => {
  let service: OfflineCacheService;
  const networkError = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(OfflineCacheService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.dispatchEvent(new Event('online'));
    localStorage.clear();
  });

  it('returns null for a key that was never cached', () => {
    expect(service.get('animal:missing')).toBeNull();
  });

  it('stores and reads back a value with its cache timestamp', () => {
    service.set('animal:1', { name: 'Rex' });

    const entry = service.get<{ name: string }>('animal:1');
    expect(entry?.data).toEqual({ name: 'Rex' });
    expect(Number.isNaN(Date.parse(entry!.cachedAt))).toBe(false);
  });

  it('returns null for a corrupted entry instead of throwing', () => {
    localStorage.setItem('paw_tag_offline:animal:1', '{not json');

    expect(service.get('animal:1')).toBeNull();
  });

  it('swallows storage errors (e.g. quota exceeded) when caching', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect(() => service.set('animal:1', { name: 'Rex' })).not.toThrow();
  });

  it('clears only offline cache entries', () => {
    service.set('animal:1', { name: 'Rex' });
    localStorage.setItem('paw_tag_access_token', 'token');

    service.clear();

    expect(service.get('animal:1')).toBeNull();
    expect(localStorage.getItem('paw_tag_access_token')).toBe('token');
  });

  it('evicts the oldest entries once the cache exceeds its limit', () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 1001; i++) {
        vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
        service.set(`animal:${i}`, i);
      }
    } finally {
      vi.useRealTimers();
    }

    expect(service.get('animal:0')).toBeNull();
    expect(service.get('animal:1')?.data).toBe(1);
    expect(service.get('animal:1000')?.data).toBe(1000);
  });

  describe('fetch', () => {
    it('emits fresh data and caches it on success', () => {
      let result: CachedResult<{ name: string }> | undefined;

      service.fetch('animal:1', of({ name: 'Rex' })).subscribe((r) => (result = r));

      expect(result?.data).toEqual({ name: 'Rex' });
      expect(result?.fromCache).toBe(false);
      expect(service.get('animal:1')?.data).toEqual({ name: 'Rex' });
    });

    it('falls back to the cached copy on a network error', () => {
      service.set('animal:1', { name: 'Rex' });
      const cachedAt = service.get('animal:1')!.cachedAt;
      let result: CachedResult<{ name: string }> | undefined;

      service.fetch<{ name: string }>('animal:1', throwError(() => networkError)).subscribe((r) => (result = r));

      expect(result).toEqual({ data: { name: 'Rex' }, fromCache: true, cachedAt });
    });

    it('falls back to the cached copy on any error while the device is offline', () => {
      service.set('animal:1', { name: 'Rex' });
      window.dispatchEvent(new Event('offline'));
      const serverError = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      let result: CachedResult<{ name: string }> | undefined;

      service.fetch<{ name: string }>('animal:1', throwError(() => serverError)).subscribe((r) => (result = r));

      expect(result?.fromCache).toBe(true);
    });

    it('rethrows a network error when nothing is cached', () => {
      let receivedError: unknown;

      service.fetch('animal:1', throwError(() => networkError)).subscribe({
        next: () => {
          throw new Error('expected an error');
        },
        error: (err) => (receivedError = err),
      });

      expect(receivedError).toBe(networkError);
    });

    it('rethrows a non-network error while online even when a cached copy exists', () => {
      service.set('animal:1', { name: 'Rex' });
      const notFound = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      let receivedError: unknown;

      service.fetch('animal:1', throwError(() => notFound)).subscribe({
        next: () => {
          throw new Error('expected an error');
        },
        error: (err) => (receivedError = err),
      });

      expect(receivedError).toBe(notFound);
    });
  });
});
