import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ImagesService } from '../../core/services/images.service';
import { LookupsService } from '../../core/services/lookups.service';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { OfflineCacheKeys, OfflineCacheService } from '../../core/services/offline-cache.service';
import { OfflineIndicatorService } from '../../core/services/offline-indicator.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { UsersService } from '../../core/services/users.service';
import { Animal, ApiError, Lookup, MedicalRecord } from '../../core/models/models';
import { onImageError } from '../../core/utils/image-placeholder.util';
import { formatDate } from '../../core/utils/medical-record-status.util';
import { OfflineNotice } from '../../shared/offline-notice/offline-notice';
import { PtImageViewer } from '../../shared/pt-image-viewer/pt-image-viewer';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-medical-record-view',
  standalone: true,
  imports: [RouterLink, OfflineNotice, PtImageViewer, PtTag],
  templateUrl: './medical-record-view.html',
  styleUrl: './medical-record-view.scss',
})
export class MedicalRecordView {
  private readonly route = inject(ActivatedRoute);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly animalsService = inject(AnimalsService);
  private readonly imagesService = inject(ImagesService);
  private readonly lookupsService = inject(LookupsService);
  private readonly usersService = inject(UsersService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly offlineCache = inject(OfflineCacheService);
  protected readonly offlineIndicator = inject(OfflineIndicatorService);
  protected readonly authState = inject(AuthStateService);

  readonly animalId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly record = signal<MedicalRecord | null>(null);
  readonly animal = signal<Animal | null>(null);
  readonly medicalRecordTypes = signal<Lookup[]>([]);
  readonly recordedByName = signal<string | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly uploadingPhotos = signal(false);
  readonly photoError = signal<string | null>(null);
  readonly viewingPhotoUrl = signal<string | null>(null);
  // Set when the record was served from the on-device cache because the network was unreachable.
  readonly cachedAt = signal<string | null>(null);
  protected readonly onImageError = onImageError;

  constructor() {
    this.pageHeader.set({ title: () => 'Medical record', left: { kind: 'back' } });

    this.offlineCache
      .fetch(OfflineCacheKeys.medicalRecordTypes, this.lookupsService.getMedicalRecordTypes())
      .subscribe({ next: ({ data }) => this.medicalRecordTypes.set(data), error: () => undefined });
    this.offlineCache
      .fetch(OfflineCacheKeys.animal(this.animalId), this.animalsService.getById(this.animalId))
      .subscribe({ next: ({ data }) => this.animal.set(data), error: () => undefined });

    const recordId = this.route.snapshot.paramMap.get('recordId');
    if (!recordId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.offlineCache.fetch(OfflineCacheKeys.medicalRecord(recordId), this.medicalRecordsService.getById(recordId)).subscribe({
      next: ({ data: record, fromCache, cachedAt }) => {
        this.record.set(record);
        this.cachedAt.set(fromCache ? cachedAt : null);
        this.loading.set(false);
        this.offlineCache.fetch(OfflineCacheKeys.user(record.createdBy), this.usersService.getById(record.createdBy)).subscribe({
          next: ({ data: user }) => this.recordedByName.set(user.name),
          error: () => this.recordedByName.set(null),
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  uploadPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) {
      return;
    }

    const record = this.record();
    if (!record) {
      return;
    }

    if (this.offlineIndicator.offline()) {
      this.photoError.set("You're offline. Adding photos needs an internet connection.");
      return;
    }

    this.photoError.set(null);
    this.uploadingPhotos.set(true);

    this.imagesService.uploadMedicalRecordImages(record.id, files).subscribe({
      next: (images) => {
        this.uploadingPhotos.set(false);
        this.record.set({ ...record, images: [...(record.images ?? []), ...images] });
      },
      error: (response: HttpErrorResponse) => {
        this.uploadingPhotos.set(false);
        const apiError = response.error as ApiError | undefined;
        this.photoError.set(apiError?.error?.message ?? 'Could not upload photos. Please try again.');
      },
    });
  }

  medicalRecordTypeName(): string {
    const typeId = this.record()?.medicalRecordTypeId;
    return this.medicalRecordTypes().find((type) => type.id === typeId)?.name ?? 'Medical record';
  }

  formatAdministeredAt(): string {
    const record = this.record();
    return record ? formatDate(new Date(record.administeredAt)) : '';
  }

  formatLoggedOn(): string {
    const record = this.record();
    if (!record) {
      return '';
    }
    return new Date(record.createdAt).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
