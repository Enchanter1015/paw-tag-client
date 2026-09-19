import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalForm } from './medical-form';
import { API_BASE_URL } from '../../core/services/api-config';
import { AuthStateService } from '../../core/services/auth-state.service';
import { Lookup, MedicalRecord } from '../../core/models/models';

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

describe('MedicalForm', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalId = 'abcd1234';
  const recordTypes: Lookup[] = [{ id: 1, name: 'Vaccination' }];

  let httpMock: HttpTestingController;

  function createComponent() {
    const fixture = TestBed.createComponent(MedicalForm);
    fixture.componentRef.setInput('animalId', animalId);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(recordTypes);
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicalForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthStateService, useValue: { currentUser: { sub: 'vet-1' } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pre-fills prescribedBy from the current user and loads record types', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.prescribedBy.value).toBe('vet-1');
    expect(component.form.controls.administeredAt.value).toBe(todayIsoDate());
    expect(component.medicalRecordTypes()).toEqual(recordTypes);
  });

  it('does not submit and shows validation errors when required fields are missing', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.form.controls.prescribedBy.setValue('');

    component.submit();

    expect(component.form.invalid).toBe(true);
    expect(component.titleError()).toBe('Enter a title for this record.');
    expect(component.medicalRecordTypeError()).toBe('Select a record type.');
    expect(component.prescribedByError()).toBe("Enter the prescribing vet's user ID.");
  });

  it('submits successfully, emits the created record, and resets the form', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    let emitted: MedicalRecord | undefined;
    component.created.subscribe((record) => (emitted = record));

    component.form.patchValue({ title: 'Rabies vaccination', medicalRecordTypeId: '1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`);
    expect(req.request.body).toEqual({
      title: 'Rabies vaccination',
      medicalRecordTypeId: 1,
      prescribedBy: 'vet-1',
      administeredAt: todayIsoDate(),
    });

    const created: MedicalRecord = {
      id: 'rec-1',
      medicalRecordTypeId: 1,
      title: 'Rabies vaccination',
      prescribedBy: 'vet-1',
      animalId,
      administeredAt: '2026-01-01T00:00:00Z',
      createdBy: 'vet-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    req.flush(created);

    expect(component.submitting()).toBe(false);
    expect(emitted).toEqual(created);
    expect(component.form.controls.title.value).toBe('');
  });

  it('maps a 400 validation error to inline field errors', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.form.patchValue({ title: 'Rabies vaccination', medicalRecordTypeId: '1' });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`);
    req.flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [{ path: 'body.prescribedBy', message: 'prescribedBy must be a valid UUID' }],
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.submitting()).toBe(false);
    expect(component.prescribedByError()).toBe('prescribedBy must be a valid UUID');
  });
});
