import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { AnimalSearch } from './animal-search';
import { API_BASE_URL } from '../../core/services/api-config';
import { Animal, Lookup } from '../../core/models/models';

describe('AnimalSearch', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalTypes: Lookup[] = [{ id: 1, name: 'Dog' }];
  let httpMock: HttpTestingController;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function createComponent(initialParams: Record<string, string> = {}) {
    queryParamMap$ = new BehaviorSubject(convertToParamMap(initialParams));
    TestBed.configureTestingModule({
      imports: [AnimalSearch],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$, snapshot: {} } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AnimalSearch);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('searches using the initial query params and renders results', () => {
    const fixture = createComponent({ query: 'Rex' });
    const component = fixture.componentInstance;

    expect(component.filterForm.controls.query.value).toBe('Rex');

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/animals`);
    expect(req.request.params.get('query')).toBe('Rex');

    const results: Animal[] = [
      { id: 'a1', name: 'Rex', animalTypeId: 1, isStreet: false, createdAt: '', updatedAt: '' },
    ];
    req.flush(results);

    expect(component.results()).toEqual(results);
    expect(component.loading()).toBe(false);
  });

  it('shows an empty state when no results are returned', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/animals`);
    req.flush([]);

    fixture.detectChanges();
    expect(component.results()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No animals found');
  });

  it('re-runs the search when query params change externally (e.g. back/forward)', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    httpMock.expectOne((r) => r.url === `${baseUrl}/animals`).flush([]);

    queryParamMap$.next(convertToParamMap({ isStreet: 'true' }));

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/animals`);
    expect(req.request.params.get('isStreet')).toBe('true');
    req.flush([]);

    expect(component.filterForm.controls.isStreet.value).toBe(true);
  });
});
