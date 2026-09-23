import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { LookupsService } from '../../core/services/lookups.service';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { UsersService } from '../../core/services/users.service';
import { Animal, ApiError, Lookup, MedicalRecord, User } from '../../core/models/models';
import { onImageError } from '../../core/utils/image-placeholder.util';
import { DueStatus, formatDate, getDueStatus, sortByAdministeredAtDesc } from '../../core/utils/medical-record-status.util';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

const RECENT_RECORDS_LIMIT = 5;

@Component({
  selector: 'app-animal-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtAvatar, PtButton, PtInput, PtTag],
  templateUrl: './animal-profile.html',
  styleUrl: './animal-profile.scss',
})
export class AnimalProfile {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly usersService = inject(UsersService);
  protected readonly authState = inject(AuthStateService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly route = inject(ActivatedRoute);

  readonly animal = signal<Animal | null>(null);
  readonly owner = signal<User | null>(null);
  readonly animalTypes = signal<Lookup[]>([]);
  readonly medicalRecordTypes = signal<Lookup[]>([]);
  readonly medicalRecords = signal<MedicalRecord[]>([]);
  readonly medicalRecordsLoading = signal(true);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly recentMedicalRecords = computed(() => this.medicalRecords().slice(0, RECENT_RECORDS_LIMIT));

  // One row per vaccine type, showing only its most recent record (medicalRecords is already
  // sorted newest-first) so a repeat vaccination doesn't produce duplicate rows for the same type.
  readonly vaccinations = computed(() => {
    const vaccineTypeIds = new Set(
      this.medicalRecordTypes()
        .filter((type) => /vaccin/i.test(type.name))
        .map((type) => type.id)
    );

    const latestByType = new Map<number, MedicalRecord>();
    for (const record of this.medicalRecords()) {
      if (vaccineTypeIds.has(record.medicalRecordTypeId) && !latestByType.has(record.medicalRecordTypeId)) {
        latestByType.set(record.medicalRecordTypeId, record);
      }
    }
    return Array.from(latestByType.values());
  });

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    dob: this.fb.control(''),
    animalTypeId: this.fb.control('', [Validators.required]),
    breed: this.fb.control(''),
    isStreet: this.fb.control(false),
  });

  constructor() {
    this.updateHeader();

    this.lookupsService.getAnimalTypes().subscribe((types) => this.animalTypes.set(types));
    this.lookupsService.getMedicalRecordTypes().subscribe((types) => this.medicalRecordTypes.set(types));

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.animalsService.getById(id).subscribe({
      next: (animal) => {
        this.animal.set(animal);
        this.loading.set(false);
        this.updateHeader();

        if (animal.createdBy) {
          this.usersService.getById(animal.createdBy).subscribe({
            next: (user) => this.owner.set(user),
            error: () => this.owner.set(null),
          });
        }
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    this.medicalRecordsService.listForAnimal(id).subscribe({
      next: (records) => {
        this.medicalRecords.set(sortByAdministeredAtDesc(records));
        this.medicalRecordsLoading.set(false);
      },
      error: () => {
        this.medicalRecordsLoading.set(false);
      },
    });
  }

  get name() {
    return this.form.controls.name;
  }

  get animalTypeId() {
    return this.form.controls.animalTypeId;
  }

  animalTypeName(animalTypeId: number): string {
    return this.animalTypes().find((type) => type.id === animalTypeId)?.name ?? 'Animal';
  }

  medicalRecordTypeName(medicalRecordTypeId: number): string {
    return this.medicalRecordTypes().find((type) => type.id === medicalRecordTypeId)?.name ?? 'Record';
  }

  medicalRecordDueStatus(record: MedicalRecord): DueStatus | null {
    return getDueStatus(record);
  }

  formatAdministeredAt(record: MedicalRecord): string {
    return formatDate(new Date(record.administeredAt));
  }

  formatNextDueDate(record: MedicalRecord): string | null {
    return record.nextDueDate ? formatDate(new Date(record.nextDueDate)) : null;
  }

  nameError(): string | null {
    if (!this.name.touched) {
      return null;
    }
    if (this.name.hasError('required')) {
      return 'Enter the animal\'s name.';
    }
    if (this.name.hasError('maxlength')) {
      return 'Name must be 100 characters or fewer.';
    }
    if (this.name.hasError('server')) {
      return this.name.getError('server');
    }
    return null;
  }

  animalTypeError(): string | null {
    if (!this.animalTypeId.touched) {
      return null;
    }
    if (this.animalTypeId.hasError('required')) {
      return 'Select an animal type.';
    }
    if (this.animalTypeId.hasError('server')) {
      return this.animalTypeId.getError('server');
    }
    return null;
  }

  startEditing(): void {
    const animal = this.animal();
    if (!animal) {
      return;
    }
    this.form.setValue({
      name: animal.name,
      dob: animal.dob ?? '',
      animalTypeId: String(animal.animalTypeId),
      breed: animal.breed ?? '',
      isStreet: animal.isStreet,
    });
    this.formError.set(null);
    this.editing.set(true);
    this.updateHeader();
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.formError.set(null);
    this.updateHeader();
  }

  save(): void {
    const animal = this.animal();
    if (!animal) {
      return;
    }

    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, dob, animalTypeId, breed, isStreet } = this.form.getRawValue();
    this.saving.set(true);

    this.animalsService
      .update(animal.id, {
        name: name!,
        animalTypeId: Number(animalTypeId),
        dob: dob || undefined,
        breed: breed || undefined,
        isStreet: isStreet ?? false,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.animal.set(updated);
          this.editing.set(false);
          this.updateHeader();
        },
        error: (response: HttpErrorResponse) => {
          this.saving.set(false);
          this.applyServerError(response);
        },
      });
  }

  private updateHeader(): void {
    if (this.editing()) {
      this.pageHeader.set({
        title: () => `Edit ${this.animal()?.name ?? ''}`.trim(),
        left: { kind: 'close', onClick: () => this.cancelEditing() },
        action: {
          kind: 'save',
          label: () => (this.saving() ? 'Saving…' : 'Save'),
          disabled: () => this.saving(),
          onClick: () => this.save(),
        },
      });
      return;
    }

    this.pageHeader.set({
      title: () => this.animal()?.name ?? 'Animal profile',
      left: { kind: 'back' },
      action:
        !this.authState.isGuest() && this.animal() ? { kind: 'edit', onClick: () => this.startEditing() } : undefined,
    });
  }

  private applyServerError(response: HttpErrorResponse): void {
    const apiError = response.error as ApiError | undefined;
    const details = apiError?.error?.details;

    if (response.status === 400 && details?.length) {
      for (const detail of details) {
        const field = detail.path.split('.').pop();
        if (field === 'name' || field === 'animalTypeId') {
          this.form.controls[field].setErrors({ server: detail.message });
          this.form.controls[field].markAsTouched();
        }
      }
      this.formError.set('Check the highlighted fields and try again.');
      return;
    }

    this.formError.set(apiError?.error?.message ?? 'Something went wrong. Please try again.');
  }
}
