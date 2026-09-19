import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnimalsService } from '../../core/services/animals.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { LookupsService } from '../../core/services/lookups.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { ApiError, Lookup } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';

const NAME_ADJECTIVES = ['Amber', 'Copper', 'Misty', 'Ginger', 'Smokey', 'Rusty', 'Shadow', 'Sunny', 'Hazel', 'Pepper'];
const NAME_NOUNS = ['Wanderer', 'Scout', 'Rover', 'Drifter', 'Whisker', 'Trail', 'Nomad', 'Ranger', 'Pebble', 'Sprout'];
const MAX_NAME_GENERATION_ATTEMPTS = 5;

@Component({
  selector: 'app-animal-register',
  standalone: true,
  imports: [ReactiveFormsModule, PtButton, PtInput],
  templateUrl: './animal-register.html',
  styleUrl: './animal-register.scss',
})
export class AnimalRegister {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly authState = inject(AuthStateService);
  private readonly lookupsService = inject(LookupsService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    dob: this.fb.control(''),
    animalTypeId: this.fb.control('', [Validators.required]),
    breed: this.fb.control(''),
    isStreet: this.fb.control(false),
  });

  readonly animalTypes = signal<Lookup[]>([]);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly generatingName = signal(false);

  constructor() {
    this.pageHeader.set({
      title: () => 'Add animal',
      left: { kind: 'back' },
      action: this.authState.isAdministrator() ? { kind: 'tag', label: 'Admin' } : undefined,
    });

    this.lookupsService.getAnimalTypes().subscribe((types) => this.animalTypes.set(types));

    // Street animals are registered with no known owner to ask, so auto-fill a placeholder
    // name rather than leaving the required field blank; never overwrite a name already typed.
    this.form.controls.isStreet.valueChanges.subscribe((isStreet) => {
      if (isStreet && !this.name.value) {
        this.assignGeneratedName();
      }
    });
  }

  get name() {
    return this.form.controls.name;
  }

  get animalTypeId() {
    return this.form.controls.animalTypeId;
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

  private async assignGeneratedName(): Promise<void> {
    this.generatingName.set(true);
    try {
      const name = await this.generateUniqueName();
      if (this.form.controls.isStreet.value && !this.name.value) {
        this.name.setValue(name);
      }
    } finally {
      this.generatingName.set(false);
    }
  }

  private async generateUniqueName(): Promise<string> {
    for (let attempt = 0; attempt < MAX_NAME_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.randomName();
      const matches = await firstValueFrom(this.animalsService.search({ query: candidate }));
      const taken = matches.some((animal) => animal.name.toLowerCase() === candidate.toLowerCase());
      if (!taken) {
        return candidate;
      }
    }

    // Exhausted retries on plain collisions; a numeric suffix makes this effectively unique.
    return `${this.randomName()} ${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private randomName(): string {
    const adjective = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    return `${adjective} ${noun}`;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.photoPreview.set(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.photoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, dob, animalTypeId, breed, isStreet } = this.form.getRawValue();
    this.submitting.set(true);

    this.animalsService
      .register({
        name: name!,
        animalTypeId: Number(animalTypeId),
        dob: dob || undefined,
        breed: breed || undefined,
        isStreet: isStreet ?? false,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigateByUrl('/');
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
