import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, from, ignoreElements, merge, mergeMap, tap } from 'rxjs';
import { MedicalRecord } from '../models/models';
import { AnimalsService } from './animals.service';
import { LookupsService } from './lookups.service';
import { MedicalRecordsService } from './medical-records.service';
import { OfflineCacheKeys, OfflineCacheService } from './offline-cache.service';
import { OfflineIndicatorService } from './offline-indicator.service';
import { UsersService } from './users.service';

// Caps parallel requests so prefetching a long animal list doesn't flood a weak connection.
const MAX_CONCURRENT_ANIMALS = 3;

// Warms the offline cache ahead of time so a worker's own animals — profile, medical record list
// and each record's detail page — open offline even if they were never viewed while online.
@Injectable({ providedIn: 'root' })
export class OfflinePrefetchService {
  private readonly cache = inject(OfflineCacheService);
  private readonly offlineIndicator = inject(OfflineIndicatorService);
  private readonly animalsService = inject(AnimalsService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly usersService = inject(UsersService);
  private readonly lookupsService = inject(LookupsService);

  // Seeds each record's detail entry from a list response, so a record opened from a list that
  // was loaded online is available offline without a separate fetch.
  rememberMedicalRecords(records: MedicalRecord[]): void {
    for (const record of records) {
      this.cache.set(OfflineCacheKeys.medicalRecord(record.id), record);
    }
  }

  // Completes once every request has settled. Individual failures are ignored: prefetching is
  // best-effort and must never surface an error to the page that triggered it.
  prefetchAnimals(animalIds: string[]): Observable<void> {
    if (this.offlineIndicator.offline() || animalIds.length === 0) {
      return EMPTY;
    }

    const fetchedUserIds = new Set<string>();
    const lookups$ = merge(
      this.cacheRequest(OfflineCacheKeys.animalTypes, this.lookupsService.getAnimalTypes()),
      this.cacheRequest(OfflineCacheKeys.medicalRecordTypes, this.lookupsService.getMedicalRecordTypes())
    );
    const animals$ = from(animalIds).pipe(
      mergeMap((id) => this.prefetchAnimal(id, fetchedUserIds), MAX_CONCURRENT_ANIMALS)
    );

    return merge(lookups$, animals$).pipe(ignoreElements());
  }

  private prefetchAnimal(id: string, fetchedUserIds: Set<string>): Observable<unknown> {
    const animal$ = this.cacheRequest(OfflineCacheKeys.animal(id), this.animalsService.getById(id)).pipe(
      mergeMap((animal) => (animal.createdBy ? this.prefetchUser(animal.createdBy, fetchedUserIds) : EMPTY))
    );

    const records$ = this.cacheRequest(
      OfflineCacheKeys.animalMedicalRecords(id),
      this.medicalRecordsService.listForAnimal(id)
    ).pipe(
      tap((records) => this.rememberMedicalRecords(records)),
      mergeMap((records) => from(records.map((record) => record.createdBy))),
      mergeMap((userId) => this.prefetchUser(userId, fetchedUserIds))
    );

    return merge(animal$, records$);
  }

  private prefetchUser(userId: string, fetchedUserIds: Set<string>): Observable<unknown> {
    if (fetchedUserIds.has(userId)) {
      return EMPTY;
    }
    fetchedUserIds.add(userId);
    return this.cacheRequest(OfflineCacheKeys.user(userId), this.usersService.getById(userId));
  }

  private cacheRequest<T>(key: string, request: Observable<T>): Observable<T> {
    return request.pipe(
      tap((data) => this.cache.set(key, data)),
      catchError(() => EMPTY)
    );
  }
}
