import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalHistory } from './medical-history';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { Animal, MedicalRecord } from '../../core/models/models';

describe('MedicalHistory', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalId = 'abcd1234';

  const overdueRecord: MedicalRecord = {
    id: 'rec-overdue',
    medicalRecordTypeId: 1,
    title: 'Rabies vaccination',
    prescribedBy: 'vet-1',
    animalId,
    administeredAt: '2025-01-01T00:00:00Z',
    nextDueDate: '2025-06-01T00:00:00Z',
    createdBy: 'vet-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const upcomingRecord: MedicalRecord = {
    id: 'rec-upcoming',
    medicalRecordTypeId: 1,
    title: 'Booster vaccination',
    prescribedBy: 'vet-1',
    animalId,
    administeredAt: '2026-01-01T00:00:00Z',
    nextDueDate: '2099-01-01T00:00:00Z',
    createdBy: 'vet-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const animal: Animal = {
    id: animalId,
    name: 'Kalu',
    animalTypeId: 1,
    isStreet: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  let httpMock: HttpTestingController;
  let authState: { isGuest: () => boolean };
  let queryParams: Record<string, string>;

  function createComponent(records: MedicalRecord[]) {
    const fixture = TestBed.createComponent(MedicalHistory);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animals/${animalId}`).flush(animal);
    httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`).flush(records);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    authState = { isGuest: () => true };
    queryParams = {};
    TestBed.configureTestingModule({
      imports: [MedicalHistory],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthStateService, useValue: authState },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: animalId }),
              get queryParamMap() {
                return convertToParamMap(queryParams);
              },
            },
          },
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('flags a record past its next due date as overdue, and an upcoming one as due', () => {
    const fixture = createComponent([overdueRecord, upcomingRecord]);
    const component = fixture.componentInstance;

    const overdueStatus = component.dueStatus(overdueRecord);
    expect(overdueStatus?.variant).toBe('danger');
    expect(overdueStatus?.label).toContain('Overdue since');

    const upcomingStatus = component.dueStatus(upcomingRecord);
    expect(upcomingStatus?.variant).toBe('warning');
    expect(upcomingStatus?.label).toContain('Due');
  });

  it('shows no due status for a record with no next due date', () => {
    const recordWithoutDueDate: MedicalRecord = { ...overdueRecord, id: 'rec-none', nextDueDate: null };
    const fixture = createComponent([recordWithoutDueDate]);

    expect(fixture.componentInstance.dueStatus(recordWithoutDueDate)).toBeNull();
  });

  it('sorts records with the most recently administered first', () => {
    const fixture = createComponent([overdueRecord, upcomingRecord]);
    const ids = fixture.componentInstance.records().map((r) => r.id);
    expect(ids).toEqual(['rec-upcoming', 'rec-overdue']);
  });

  it("sets the page header title to \"Records · \" plus the animal's name once loaded", () => {
    createComponent([]);
    const pageHeader = TestBed.inject(PageHeaderService);

    expect(pageHeader.config().title()).toBe('Records · Kalu');
    expect(pageHeader.config().left).toEqual({ kind: 'back' });
  });

  it('links each record row to its detail view', () => {
    const fixture = createComponent([overdueRecord]);

    const link = fixture.nativeElement.querySelector('a.medical-record-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe(`/animals/${animalId}/medical-records/${overdueRecord.id}`);
  });

  it('hides the add-record control for a guest', () => {
    const fixture = createComponent([]);
    expect(fixture.nativeElement.querySelector('app-medical-form')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Add medical record');
  });

  it('prepends a newly created record to the history for an authenticated user', () => {
    authState.isGuest = () => false;
    const fixture = createComponent([upcomingRecord]);
    const component = fixture.componentInstance;

    component.showForm.set(true);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush([]);

    const newRecord: MedicalRecord = { ...overdueRecord, id: 'rec-new', administeredAt: '2026-06-01T00:00:00Z' };
    component.onRecordCreated(newRecord);

    expect(component.records().map((r) => r.id)).toEqual(['rec-new', 'rec-upcoming']);
    expect(component.showForm()).toBe(false);
  });

  it('opens the add-record form automatically when linked with ?add=true for an authenticated user', () => {
    authState.isGuest = () => false;
    queryParams = { add: 'true' };
    const fixture = createComponent([]);
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush([]);

    expect(fixture.componentInstance.showForm()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-medical-form')).toBeTruthy();
  });

  it('ignores ?add=true for a guest', () => {
    queryParams = { add: 'true' };
    const fixture = createComponent([]);

    expect(fixture.componentInstance.showForm()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-medical-form')).toBeNull();
  });
});
