import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { LookupsService } from '../../core/services/lookups.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ApiError, Lookup, MedicalRecord } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';

@Component({
  selector: 'app-medical-form',
  standalone: true,
  imports: [ReactiveFormsModule, PtButton, PtInput],
  templateUrl: './medical-form.html',
  styleUrl: './medical-form.scss',
})
export class MedicalForm {
  private readonly fb = inject(FormBuilder);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly authState = inject(AuthStateService);

  @Input({ required: true }) animalId!: string;
  @Output() readonly created = new EventEmitter<MedicalRecord>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly medicalRecordTypes = signal<Lookup[]>([]);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    description: this.fb.control(''),
    medicalRecordTypeId: this.fb.control('', [Validators.required]),
    prescribedBy: this.fb.control(this.authState.currentUser?.sub ?? '', [Validators.required]),
    administeredAt: this.fb.control(this.todayIsoDate()),
    nextDueDate: this.fb.control(''),
  });

  constructor() {
    this.lookupsService.getMedicalRecordTypes().subscribe((types) => this.medicalRecordTypes.set(types));
  }

  get title() {
    return this.form.controls.title;
  }

  get medicalRecordTypeId() {
    return this.form.controls.medicalRecordTypeId;
  }

  get prescribedBy() {
    return this.form.controls.prescribedBy;
  }

  titleError(): string | null {
    if (!this.title.touched) {
      return null;
    }
    if (this.title.hasError('required')) {
      return 'Enter a title for this record.';
    }
    if (this.title.hasError('maxlength')) {
      return 'Title must be 200 characters or fewer.';
    }
    if (this.title.hasError('server')) {
      return this.title.getError('server');
    }
    return null;
  }

  medicalRecordTypeError(): string | null {
    if (!this.medicalRecordTypeId.touched) {
      return null;
    }
    if (this.medicalRecordTypeId.hasError('required')) {
      return 'Select a record type.';
    }
    if (this.medicalRecordTypeId.hasError('server')) {
      return this.medicalRecordTypeId.getError('server');
    }
    return null;
  }

  prescribedByError(): string | null {
    if (!this.prescribedBy.touched) {
      return null;
    }
    if (this.prescribedBy.hasError('required')) {
      return "Enter the prescribing vet's user ID.";
    }
    if (this.prescribedBy.hasError('server')) {
      return this.prescribedBy.getError('server');
    }
    return null;
  }

  submit(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, medicalRecordTypeId, prescribedBy, administeredAt, nextDueDate } =
      this.form.getRawValue();
    this.submitting.set(true);

    this.medicalRecordsService
      .addForAnimal(this.animalId, {
        title: title!,
        medicalRecordTypeId: Number(medicalRecordTypeId),
        prescribedBy: prescribedBy!,
        description: description || undefined,
        administeredAt: administeredAt || undefined,
        nextDueDate: nextDueDate || undefined,
      })
      .subscribe({
        next: (record) => {
          this.submitting.set(false);
          this.created.emit(record);
          this.form.reset({
            title: '',
            description: '',
            medicalRecordTypeId: '',
            prescribedBy: this.authState.currentUser?.sub ?? '',
            administeredAt: this.todayIsoDate(),
            nextDueDate: '',
          });
        },
        error: (response: HttpErrorResponse) => {
          this.submitting.set(false);
          this.applyServerError(response);
        },
      });
  }

  private applyServerError(response: HttpErrorResponse): void {
    const apiError = response.error as ApiError | undefined;
    const details = apiError?.error?.details;

    if (response.status === 400 && details?.length) {
      for (const detail of details) {
        const field = detail.path.split('.').pop();
        if (field === 'title' || field === 'medicalRecordTypeId' || field === 'prescribedBy') {
          this.form.controls[field].setErrors({ server: detail.message });
          this.form.controls[field].markAsTouched();
        }
      }
      this.formError.set('Check the highlighted fields and try again.');
      return;
    }

    this.formError.set(apiError?.error?.message ?? 'Something went wrong. Please try again.');
  }

  private todayIsoDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}
