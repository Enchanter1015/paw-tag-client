import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalProfile } from './animal-profile';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { Animal, Lookup } from '../../core/models/models';

describe('AnimalProfile', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalTypes: Lookup[] = [{ id: 1, name: 'Dog' }];
  const animal: Animal = {
    id: 'abcd1234',
    name: 'Rex',
    animalTypeId: 1,
    breed: 'Labrador',
    isStreet: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;
  let authState: { isGuest: () => boolean };

  function createComponent() {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(animal);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    authState = { isGuest: () => true };
    TestBed.configureTestingModule({
      imports: [AnimalProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthStateService, useValue: authState },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: animal.id }) } },
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows a read-only view with no edit button for a guest', () => {
    const fixture = createComponent();

    const editButton = fixture.nativeElement.querySelector('pt-button');
    expect(editButton).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Rex');
  });

  it('shows an edit button for an authenticated user and lets them edit', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.startEditing();
    fixture.detectChanges();

    expect(component.editing()).toBe(true);
    expect(component.form.controls.name.value).toBe('Rex');

    component.form.controls.name.setValue('Rex Updated');
    component.save();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Rex Updated', animalTypeId: 1, breed: 'Labrador', isStreet: false });

    req.flush({ ...animal, name: 'Rex Updated' });

    expect(component.saving()).toBe(false);
    expect(component.editing()).toBe(false);
    expect(component.animal()?.name).toBe('Rex Updated');
  });

  it('shows a not-found message when the animal does not exist', () => {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.notFound()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal not found');
  });
});
