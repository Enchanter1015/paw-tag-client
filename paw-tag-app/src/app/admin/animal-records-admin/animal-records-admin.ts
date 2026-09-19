import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AnimalsService } from '../../core/services/animals.service';
import { LookupsService } from '../../core/services/lookups.service';
import { Animal, ApiError, Lookup } from '../../core/models/models';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

type PendingAction =
  | { type: 'remove'; animal: Animal }
  | { type: 'merge'; animal: Animal; targetId: string };

@Component({
  selector: 'app-animal-records-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtButton, PtInput, PtTag, ConfirmDialog],
  templateUrl: './animal-records-admin.html',
  styleUrl: './animal-records-admin.scss',
})
export class AnimalRecordsAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly lookupsService = inject(LookupsService);

  readonly filterForm = this.fb.group({
    query: this.fb.control(''),
    animalTypeId: this.fb.control(''),
    isStreet: this.fb.control(false),
  });

  readonly animalTypes = signal<Lookup[]>([]);
  readonly animals = signal<Animal[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly mergingId = signal<string | null>(null);
  readonly mergeTargetId = new FormControl('', { nonNullable: true });
  readonly mergeTargetError = signal<string | null>(null);

  readonly pendingAction = signal<PendingAction | null>(null);
  readonly actionInFlight = signal(false);

  constructor() {
    this.lookupsService.getAnimalTypes().subscribe((types) => this.animalTypes.set(types));
    this.runSearch();
    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.runSearch());
  }

  animalTypeName(animalTypeId: number): string {
    return this.animalTypes().find((type) => type.id === animalTypeId)?.name ?? 'Animal';
  }

  toggleMerge(animal: Animal): void {
    this.actionError.set(null);
    if (this.mergingId() === animal.id) {
      this.mergingId.set(null);
      return;
    }
    this.mergeTargetId.setValue('');
    this.mergeTargetError.set(null);
    this.mergingId.set(animal.id);
  }

  confirmMergeTarget(animal: Animal): void {
    const targetId = this.mergeTargetId.value.trim();
    if (!targetId) {
      this.mergeTargetError.set('Enter the animal ID to merge into.');
      return;
    }
    if (targetId === animal.id) {
      this.mergeTargetError.set('Choose a different animal to merge into.');
      return;
    }
    this.mergeTargetError.set(null);
    this.pendingAction.set({ type: 'merge', animal, targetId });
  }

  requestRemove(animal: Animal): void {
    this.actionError.set(null);
    this.pendingAction.set({ type: 'remove', animal });
  }

  cancelPendingAction(): void {
    this.pendingAction.set(null);
  }

  dialogTitle(): string {
    const action = this.pendingAction();
    return action?.type === 'remove' ? 'Remove this animal?' : 'Merge these records?';
  }

  dialogMessage(): string {
    const action = this.pendingAction();
    if (!action) {
      return '';
    }
    if (action.type === 'remove') {
      return `This permanently deletes ${action.animal.name}'s record. This cannot be undone.`;
    }
    return `This moves all records from ${action.animal.name} onto animal ${action.targetId} and deletes this record. This cannot be undone.`;
  }

  dialogConfirmLabel(): string {
    if (this.actionInFlight()) {
      return 'Working…';
    }
    return this.pendingAction()?.type === 'remove' ? 'Remove' : 'Merge';
  }

  confirmPendingAction(): void {
    const action = this.pendingAction();
    if (!action) {
      return;
    }

    this.actionInFlight.set(true);

    if (action.type === 'remove') {
      this.animalsService.remove(action.animal.id).subscribe({
        next: () => {
          this.actionInFlight.set(false);
          this.pendingAction.set(null);
          this.animals.update((animals) => animals.filter((a) => a.id !== action.animal.id));
        },
        error: (response) => {
          this.actionInFlight.set(false);
          this.pendingAction.set(null);
          this.actionError.set(this.errorMessage(response));
        },
      });
      return;
    }

    this.animalsService.merge(action.animal.id, { targetId: action.targetId }).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.pendingAction.set(null);
        this.mergingId.set(null);
        // The merged-away source animal no longer exists; its records now live on the target.
        this.animals.update((animals) => animals.filter((a) => a.id !== action.animal.id));
      },
      error: (response) => {
        this.actionInFlight.set(false);
        this.pendingAction.set(null);
        this.actionError.set(this.errorMessage(response));
      },
    });
  }

  private runSearch(): void {
    const { query, animalTypeId, isStreet } = this.filterForm.getRawValue();
    this.loading.set(true);
    this.loadError.set(null);

    this.animalsService
      .search({
        query: query || undefined,
        animalTypeId: animalTypeId ? Number(animalTypeId) : undefined,
        isStreet: isStreet || undefined,
      })
      .subscribe({
        next: (results) => {
          this.animals.set(results);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Could not load animals. Please try again.');
        },
      });
  }

  private errorMessage(response: unknown): string {
    const apiError = (response as { error?: ApiError })?.error;
    return apiError?.error?.message ?? 'Something went wrong. Please try again.';
  }
}
