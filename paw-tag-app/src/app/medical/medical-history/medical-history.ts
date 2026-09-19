import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { MedicalRecord } from '../../core/models/models';
import { DueStatus, formatDate, getDueStatus, sortByAdministeredAtDesc } from '../../core/utils/medical-record-status.util';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtTag } from '../../shared/pt-tag/pt-tag';
import { MedicalForm } from '../medical-form/medical-form';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [RouterLink, PtButton, PtTag, MedicalForm],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss',
})
export class MedicalHistory {
  private readonly animalsService = inject(AnimalsService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pageHeader = inject(PageHeaderService);
  protected readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);

  readonly animalId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly animalName = signal<string | null>(null);
  readonly records = signal<MedicalRecord[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

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

    this.animalsService.getById(this.animalId).subscribe({
      next: (animal) => this.animalName.set(animal.name),
      error: () => {},
    });

    this.medicalRecordsService.listForAnimal(this.animalId).subscribe({
      next: (records) => {
        this.records.set(sortByAdministeredAtDesc(records));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Could not load medical history. Please try again.');
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
