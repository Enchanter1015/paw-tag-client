import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalProfile } from './animal-profile';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, Lookup, MedicalRecord } from '../../core/models/models';

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

  const medicalRecordTypes: Lookup[] = [{ id: 1, name: 'Vaccination' }];

  let httpMock: HttpTestingController;
  let authState: { isGuest: () => boolean };

  function createComponent(medicalRecords: MedicalRecord[] = []) {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(animal);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush(medicalRecords);
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

  it('shows a read-only view with a QR code link but no edit button for a guest', () => {
    const fixture = createComponent();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('pt-button'));
    expect(buttons.some((b) => b.textContent?.includes('Edit animal'))).toBe(false);
    expect(buttons.some((b) => b.textContent?.includes('View QR code'))).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Rex');
    expect(fixture.nativeElement.textContent).not.toContain('Add medical record');
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

  it('shows an "Add medical record" link for an authenticated user that deep-links to the form', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();

    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a.animal-profile-link'));
    const addLink = links.find((a) => a.textContent?.includes('Add medical record'));

    expect(addLink).toBeTruthy();
    expect(addLink!.getAttribute('href')).toBe(`/animals/${animal.id}/medical-records?add=true`);
  });

  it('points the header at an edit action once an authenticated user\'s animal has loaded', () => {
    authState.isGuest = () => false;
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Rex');
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
    expect(pageHeader.config().action?.kind).toBe('edit');
  });

  it('omits the header edit action for a guest', () => {
    createComponent();
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().action).toBeUndefined();
  });

  it('switches the header to a close+save action while editing, then back to edit after saving', () => {
    authState.isGuest = () => false;
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const pageHeader = TestBed.inject(PageHeaderService);

    component.startEditing();
    fixture.detectChanges();

    expect(pageHeader.config().left.kind).toBe('close');
    expect(pageHeader.config().title()).toBe('Edit Rex');
    expect(pageHeader.config().action?.kind).toBe('save');

    component.form.controls.name.setValue('Rex Updated');
    component.save();
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush({ ...animal, name: 'Rex Updated' });

    expect(pageHeader.config().left).toEqual({ kind: 'back' });
    expect(pageHeader.config().title()).toBe('Rex Updated');
    expect(pageHeader.config().action?.kind).toBe('edit');
  });

  it('shows a not-found message when the animal does not exist', () => {
    const fixture = TestBed.createComponent(AnimalProfile);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animal-types`).flush(animalTypes);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}/medical-records`).flush([]);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.notFound()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Animal not found');
  });

  function makeRecord(overrides: Partial<MedicalRecord>): MedicalRecord {
    return {
      id: 'rec-1',
      medicalRecordTypeId: 1,
      title: 'Record',
      prescribedBy: 'vet-1',
      animalId: animal.id,
      administeredAt: '2026-01-01T00:00:00Z',
      createdBy: 'vet-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  it('shows only the 5 most recently administered medical records, with a link to view all', () => {
    const records = Array.from({ length: 7 }, (_, i) =>
      makeRecord({ id: `rec-${i}`, administeredAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    const fixture = createComponent(records);
    const component = fixture.componentInstance;

    expect(component.recentMedicalRecords().length).toBe(5);
    expect(component.recentMedicalRecords()[0].id).toBe('rec-6');

    const link = fixture.nativeElement.querySelector('a.animal-profile-link');
    expect(link.textContent).toContain('View all medical records');
    expect(link.getAttribute('href')).toBe(`/animals/${animal.id}/medical-records`);
  });

  it('lists a vaccination-type record with a future next due date as an upcoming vaccination', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const records = [
      makeRecord({ id: 'rec-upcoming', medicalRecordTypeId: 1, nextDueDate: futureDate }),
    ];
    const fixture = createComponent(records);
    const component = fixture.componentInstance;

    expect(component.upcomingVaccinations().map((r) => r.id)).toEqual(['rec-upcoming']);
  });

  it('excludes an overdue vaccination and a non-vaccination record from upcoming vaccinations', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const records = [
      makeRecord({ id: 'rec-overdue', medicalRecordTypeId: 1, nextDueDate: pastDate }),
      makeRecord({ id: 'rec-other-type', medicalRecordTypeId: 2, nextDueDate: futureDate }),
    ];
    const fixture = createComponent(records);

    expect(fixture.componentInstance.upcomingVaccinations()).toEqual([]);
  });
});
