import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { LookupsService } from '../../core/services/lookups.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { Animal, ApiError, Lookup } from '../../core/models/models';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-animal-profile',
  standalone: true,
  imports: [ReactiveFormsModule, PtAvatar, PtButton, PtInput, PtTag],
  templateUrl: './animal-profile.html',
  styleUrl: './animal-profile.scss',
})
export class AnimalProfile {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly lookupsService = inject(LookupsService);
  protected readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);

  readonly animal = signal<Animal | null>(null);
  readonly animalTypes = signal<Lookup[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    dob: this.fb.control(''),
    animalTypeId: this.fb.control('', [Validators.required]),
    breed: this.fb.control(''),
    isStreet: this.fb.control(false),
  });

  constructor() {
    this.lookupsService.getAnimalTypes().subscribe((types) => this.animalTypes.set(types));

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
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
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
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.formError.set(null);
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
        },
        error: (response: HttpErrorResponse) => {
          this.saving.set(false);
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
