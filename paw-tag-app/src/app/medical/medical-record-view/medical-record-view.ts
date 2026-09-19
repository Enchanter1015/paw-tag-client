import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { LookupsService } from '../../core/services/lookups.service';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { UsersService } from '../../core/services/users.service';
import { Animal, Lookup, MedicalRecord } from '../../core/models/models';
import { formatDate } from '../../core/utils/medical-record-status.util';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-medical-record-view',
  standalone: true,
  imports: [RouterLink, PtTag],
  templateUrl: './medical-record-view.html',
  styleUrl: './medical-record-view.scss',
})
export class MedicalRecordView {
  private readonly route = inject(ActivatedRoute);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly animalsService = inject(AnimalsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly usersService = inject(UsersService);
  private readonly pageHeader = inject(PageHeaderService);

  readonly animalId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly record = signal<MedicalRecord | null>(null);
  readonly animal = signal<Animal | null>(null);
  readonly medicalRecordTypes = signal<Lookup[]>([]);
  readonly recordedByName = signal<string | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  constructor() {
    this.pageHeader.set({ title: () => 'Medical record', left: { kind: 'back' } });

    this.lookupsService.getMedicalRecordTypes().subscribe((types) => this.medicalRecordTypes.set(types));
    this.animalsService.getById(this.animalId).subscribe((animal) => this.animal.set(animal));

    const recordId = this.route.snapshot.paramMap.get('recordId');
    if (!recordId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.medicalRecordsService.getById(recordId).subscribe({
      next: (record) => {
        this.record.set(record);
        this.loading.set(false);
        this.usersService.getById(record.createdBy).subscribe({
          next: (user) => this.recordedByName.set(user.name),
          error: () => this.recordedByName.set(null),
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
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
