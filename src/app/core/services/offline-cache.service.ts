import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { OfflineIndicatorService } from './offline-indicator.service';

const KEY_PREFIX = 'paw_tag_offline:';
// Room for a worker's own animals (each prefetches its profile, record list, every record and
// their authors) plus a day of scanned profiles, without letting localStorage grow unbounded;
// the oldest entries are evicted first.
const MAX_ENTRIES = 1000;

// Single source of cache keys so a page reading an entry and the prefetcher writing it agree.
export const OfflineCacheKeys = {
  animal: (id: string) => `animal:${id}`,
  animalMedicalRecords: (animalId: string) => `animal-medical-records:${animalId}`,
  medicalRecord: (id: string) => `medical-record:${id}`,
  user: (id: string) => `user:${id}`,
  myAnimals: (userId: string) => `my-animals:${userId}`,
  animalTypes: 'animal-types',
  medicalRecordTypes: 'medical-record-types',
} as const;

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
}

export interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  cachedAt: string;
}

// Persists successful GET responses to localStorage so previously viewed data is still available
// when the device loses connectivity. Unlike the service worker (web only), this also works in the
// Cordova build, which is served from file:// where service workers can't register.
@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private readonly offlineIndicator = inject(OfflineIndicatorService);

  get<T>(key: string): CacheEntry<T> | null {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + key);
      return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() };
    try {
      localStorage.setItem(KEY_PREFIX + key, JSON.stringify(entry));
      this.evictOverflow();
    } catch {
      // Storage full or unavailable (e.g. private mode) — offline caching is best-effort.
    }
  }

  clear(): void {
    for (const key of this.cacheKeys()) {
      localStorage.removeItem(key);
    }
  }

  // Runs the request, caching the response on success. On a network failure (or any failure
  // while the device reports it is offline) it falls back to the last cached response for `key`;
  // every other error (404, 403, …) is passed through so callers keep their normal handling.
  fetch<T>(key: string, request: Observable<T>): Observable<CachedResult<T>> {
    return request.pipe(
      tap((data) => this.set(key, data)),
      map((data) => ({ data, fromCache: false, cachedAt: new Date().toISOString() })),
      catchError((error: unknown) => {
        const cached = this.isConnectivityError(error) ? this.get<T>(key) : null;
        return cached
          ? of({ data: cached.data, fromCache: true, cachedAt: cached.cachedAt })
          : throwError(() => error);
      })
    );
  }

  private isConnectivityError(error: unknown): boolean {
    return this.offlineIndicator.offline() || (error instanceof HttpErrorResponse && error.status === 0);
  }

  private cacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private evictOverflow(): void {
    const keys = this.cacheKeys();
    if (keys.length <= MAX_ENTRIES) {
      return;
    }
    const byAge = keys
      .map((key) => ({ key, cachedAt: this.get<unknown>(key.slice(KEY_PREFIX.length))?.cachedAt ?? '' }))
      .sort((a, b) => a.cachedAt.localeCompare(b.cachedAt));
    for (const { key } of byAge.slice(0, keys.length - MAX_ENTRIES)) {
      localStorage.removeItem(key);
    }
  }
}
