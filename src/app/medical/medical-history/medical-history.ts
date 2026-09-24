import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { OfflineCacheKeys, OfflineCacheService } from '../../core/services/offline-cache.service';
import { OfflineIndicatorService } from '../../core/services/offline-indicator.service';
import { OfflinePrefetchService } from '../../core/services/offline-prefetch.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { MedicalRecord } from '../../core/models/models';
import { onImageError } from '../../core/utils/image-placeholder.util';
import { DueStatus, formatDate, getDueStatus, sortByAdministeredAtDesc } from '../../core/utils/medical-record-status.util';
import { OfflineNotice } from '../../shared/offline-notice/offline-notice';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtTag } from '../../shared/pt-tag/pt-tag';
import { MedicalForm } from '../medical-form/medical-form';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [RouterLink, OfflineNotice, PtButton, PtTag, MedicalForm],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss',
})
export class MedicalHistory {
  private readonly animalsService = inject(AnimalsService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly offlineCache = inject(OfflineCacheService);
  private readonly offlinePrefetch = inject(OfflinePrefetchService);
  protected readonly offlineIndicator = inject(OfflineIndicatorService);
  protected readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);

  readonly animalId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly animalName = signal<string | null>(null);
  readonly records = signal<MedicalRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  // Set when the list was served from the on-device cache because the network was unreachable.
  readonly cachedAt = signal<string | null>(null);
  protected readonly onImageError = onImageError;

  // Supports a deep link from AnimalProfile's "Add medical record" button (?add=true),
  // opening the form immediately instead of requiring an extra click.
  readonly showForm = signal(
    this.route.snapshot.queryParamMap.get('add') === 'true' && !this.authState.isGuest()
  );

  constructor() {
    this.pageHeader.set({
      title: () => (this.animalName() ? `Records · ${this.animalName()}` : 'Records'),
      left: { kind: 'back' },
    });

    this.offlineCache
      .fetch(OfflineCacheKeys.animal(this.animalId), this.animalsService.getById(this.animalId))
      .subscribe({
        next: ({ data: animal }) => this.animalName.set(animal.name),
        error: () => {},
      });

    this.offlineCache
      .fetch(OfflineCacheKeys.animalMedicalRecords(this.animalId), this.medicalRecordsService.listForAnimal(this.animalId))
      .subscribe({
        next: ({ data: records, fromCache, cachedAt }) => {
          if (!fromCache) {
            this.offlinePrefetch.rememberMedicalRecords(records);
          }
          this.records.set(sortByAdministeredAtDesc(records));
          this.cachedAt.set(fromCache ? cachedAt : null);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(
            this.offlineIndicator.offline()
              ? "You're offline and this medical history hasn't been saved on this device yet. Connect to the internet to view it."
              : 'Could not load medical history. Please try again.'
          );
        },
      });
  }

  onRecordCreated(record: MedicalRecord): void {
    this.records.update((records) => sortByAdministeredAtDesc([record, ...records]));
    this.showForm.set(false);
  }

  dueStatus(record: MedicalRecord): DueStatus | null {
    return getDueStatus(record);
  }

  formatAdministeredAt(record: MedicalRecord): string {
    return formatDate(new Date(record.administeredAt));
  }
}
