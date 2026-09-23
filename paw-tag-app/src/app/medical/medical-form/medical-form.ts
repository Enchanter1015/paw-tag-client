import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, switchMap, of } from 'rxjs';
import { MedicalRecordsService } from '../../core/services/medical-records.service';
import { ImagesService } from '../../core/services/images.service';
import { LookupsService } from '../../core/services/lookups.service';
import { VetHospitalsService } from '../../core/services/vet-hospitals.service';
import { ApiError, Lookup, MedicalRecord, VetHospital } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';

interface StagedPhoto {
  file: File;
  previewUrl: string;
}

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
  private readonly imagesService = inject(ImagesService);
  private readonly lookupsService = inject(LookupsService);
  private readonly vetHospitalsService = inject(VetHospitalsService);

  @Input({ required: true }) animalId!: string;
  @Output() readonly created = new EventEmitter<MedicalRecord>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly medicalRecordTypes = signal<Lookup[]>([]);
  readonly submitting = signal(false);
  readonly uploadingPhotos = signal(false);
  readonly formError = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);
  readonly stagedPhotos = signal<StagedPhoto[]>([]);

  readonly hospitalSearch = new FormControl('');
  readonly hospitalSearching = signal(false);
  readonly hospitalResults = signal<VetHospital[]>([]);
  readonly selectedHospital = signal<VetHospital | null>(null);

  readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    description: this.fb.control(''),
    medicalRecordTypeId: this.fb.control('', [Validators.required]),
    prescribedBy: this.fb.control('', [Validators.required]),
    administeredAt: this.fb.control(this.todayIsoDate()),
    nextDueDate: this.fb.control(''),
  });

  constructor() {
    this.lookupsService.getMedicalRecordTypes().subscribe((types) => this.medicalRecordTypes.set(types));

    this.hospitalSearch.valueChanges
      .pipe(
        debounceTime(300),
        switchMap((query) => {
          const trimmed = (query ?? '').trim();
          if (!trimmed) {
            return of([]);
          }
          this.hospitalSearching.set(true);
          return this.vetHospitalsService.search(trimmed);
        })
      )
      .subscribe((hospitals) => {
        this.hospitalSearching.set(false);
        this.hospitalResults.set(hospitals);
      });
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
      return 'Select the prescribing vet hospital.';
    }
    if (this.prescribedBy.hasError('server')) {
      return this.prescribedBy.getError('server');
    }
    return null;
  }

  selectHospital(hospital: VetHospital): void {
    this.selectedHospital.set(hospital);
    this.hospitalResults.set([]);
    this.hospitalSearch.setValue(hospital.name, { emitEvent: false });
    this.prescribedBy.setValue(hospital.id);
    this.prescribedBy.markAsTouched();
  }

  changeHospital(): void {
    this.selectedHospital.set(null);
    this.prescribedBy.setValue('');
    this.hospitalSearch.setValue('');
  }

  addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (files.length === 0) {
      return;
    }

    this.photoError.set(null);
    const staged = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    this.stagedPhotos.set([...this.stagedPhotos(), ...staged]);
  }

  removePhoto(index: number): void {
    const photos = this.stagedPhotos();
    URL.revokeObjectURL(photos[index].previewUrl);
    this.stagedPhotos.set(photos.filter((_, i) => i !== index));
  }

  submit(): void {
    this.formError.set(null);
    this.photoError.set(null);

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
        next: (record) => this.uploadStagedPhotos(record),
        error: (response: HttpErrorResponse) => {
          this.submitting.set(false);
          this.applyServerError(response);
        },
      });
  }

  private uploadStagedPhotos(record: MedicalRecord): void {
    const photos = this.stagedPhotos();
    if (photos.length === 0) {
      this.finishSubmit(record);
      return;
    }

    this.uploadingPhotos.set(true);
    this.imagesService.uploadMedicalRecordImages(record.id, photos.map((p) => p.file)).subscribe({
      next: (images) => {
        this.uploadingPhotos.set(false);
        this.finishSubmit({ ...record, images });
      },
      error: (response: HttpErrorResponse) => {
        this.uploadingPhotos.set(false);
        const apiError = response.error as ApiError | undefined;
        this.photoError.set(
          apiError?.error?.message ?? 'The record was saved, but the photos could not be uploaded.'
        );
        this.finishSubmit(record);
      },
    });
  }

  private finishSubmit(record: MedicalRecord): void {
    this.submitting.set(false);
    this.created.emit(record);
    for (const photo of this.stagedPhotos()) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    this.stagedPhotos.set([]);
    this.selectedHospital.set(null);
    this.hospitalSearch.setValue('');
    this.form.reset({
      title: '',
      description: '',
      medicalRecordTypeId: '',
      prescribedBy: '',
      administeredAt: this.todayIsoDate(),
      nextDueDate: '',
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
