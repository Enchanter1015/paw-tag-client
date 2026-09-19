import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AnimalsService } from '../../core/services/animals.service';
import { LookupsService } from '../../core/services/lookups.service';
import { Animal, Lookup } from '../../core/models/models';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtInput } from '../../shared/pt-input/pt-input';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-animal-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PtAvatar, PtInput, PtTag],
  templateUrl: './animal-search.html',
  styleUrl: './animal-search.scss',
})
export class AnimalSearch {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly filterForm = this.fb.group({
    query: this.fb.control(''),
    animalTypeId: this.fb.control(''),
    isStreet: this.fb.control(false),
  });

  readonly animalTypes = signal<Lookup[]>([]);
  readonly results = signal<Animal[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.lookupsService.getAnimalTypes().subscribe((types) => this.animalTypes.set(types));

    // The URL query params are the source of truth: a filter change updates them, and this
    // subscription (re-)runs the search and syncs the form whenever they change, including
    // from browser back/forward navigation.
    this.route.queryParamMap.subscribe((params) => {
      this.filterForm.patchValue(
        {
          query: params.get('query') ?? '',
          animalTypeId: params.get('animalTypeId') ?? '',
          isStreet: params.get('isStreet') === 'true',
        },
        { emitEvent: false }
      );
      this.runSearch();
    });

    this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => this.syncQueryParams());
  }

  animalTypeName(animalTypeId: number): string {
    return this.animalTypes().find((type) => type.id === animalTypeId)?.name ?? 'Animal';
  }

  private syncQueryParams(): void {
    const { query, animalTypeId, isStreet } = this.filterForm.getRawValue();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        query: query || null,
        animalTypeId: animalTypeId || null,
        isStreet: isStreet ? 'true' : null,
      },
      replaceUrl: true,
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
          this.results.set(results);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Could not load animals. Please try again.');
        },
      });
  }
}
