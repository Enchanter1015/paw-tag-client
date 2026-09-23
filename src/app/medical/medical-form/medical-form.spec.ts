import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalForm } from './medical-form';
import { API_BASE_URL } from '../../core/services/api-config';
import { Lookup, MedicalRecord, VetHospital } from '../../core/models/models';

describe('MedicalForm', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
  const animalId = 'abcd1234';
  const medicalRecordTypes: Lookup[] = [{ id: 1, name: 'Vaccination' }];

  const record: MedicalRecord = {
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

  let httpMock: HttpTestingController;

  function createComponent() {
    const fixture = TestBed.createComponent(MedicalForm);
    fixture.componentInstance.animalId = animalId;
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/medical-record-types`).flush(medicalRecordTypes);
    fixture.detectChanges();
    return fixture;
  }

  function fillRequiredFields(component: MedicalForm) {
    component.form.setValue({
      title: 'Rabies vaccination',
      description: '',
      medicalRecordTypeId: '1',
      prescribedBy: 'vet-1',
      administeredAt: '2026-01-01',
      nextDueDate: '',
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicalForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('stages selected photos for preview and lets them be removed', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.addPhotos({ target: input } as unknown as Event);

    expect(component.stagedPhotos().length).toBe(1);
    expect(component.stagedPhotos()[0].file).toBe(file);

    component.removePhoto(0);
    expect(component.stagedPhotos().length).toBe(0);
  });

  it('creates the record then uploads staged photos, emitting the record with images', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fillRequiredFields(component);

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.addPhotos({ target: input } as unknown as Event);

    let emitted: MedicalRecord | undefined;
    component.created.subscribe((r) => (emitted = r));

    component.submit();

    const createReq = httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`);
    createReq.flush(record);

    expect(component.uploadingPhotos()).toBe(true);

    const uploadReq = httpMock.expectOne(`${baseUrl}/medical-records/${record.id}/images`);
    expect(uploadReq.request.method).toBe('POST');
    expect(uploadReq.request.body instanceof FormData).toBe(true);

    const image = {
      id: 'img-1',
      medicalRecordId: record.id,
      s3Key: 'k',
      url: 'http://example.com/1.webp',
      createdBy: 'vet-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    uploadReq.flush([image]);

    expect(component.uploadingPhotos()).toBe(false);
    expect(component.submitting()).toBe(false);
    expect(component.stagedPhotos()).toEqual([]);
    expect(emitted).toEqual({ ...record, images: [image] });
  });

  it('creates the record without an image upload when no photos were staged', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fillRequiredFields(component);

    let emitted: MedicalRecord | undefined;
    component.created.subscribe((r) => (emitted = r));

    component.submit();

    httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`).flush(record);

    expect(emitted).toEqual(record);
  });

  it('still emits the created record and shows an error when photo upload fails', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fillRequiredFields(component);

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = { files: [file] as unknown as FileList, value: '' } as unknown as HTMLInputElement;
    component.addPhotos({ target: input } as unknown as Event);

    let emitted: MedicalRecord | undefined;
    component.created.subscribe((r) => (emitted = r));

    component.submit();
    httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`).flush(record);

    const uploadReq = httpMock.expectOne(`${baseUrl}/medical-records/${record.id}/images`);
    uploadReq.flush({ error: { code: 'BAD_REQUEST', message: 'Invalid image' } }, { status: 400, statusText: 'Bad Request' });

    expect(component.photoError()).toBe('Invalid image');
    expect(emitted).toEqual(record);
  });

  const hospital: VetHospital = {
    id: 'hosp-1',
    name: 'City Vet Clinic',
    vetHospitalTypeId: 1,
    isVerified: true,
    isArchived: false,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('searches vet hospitals as the user types and lets them pick one', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.hospitalSearch.setValue('City');

    let req: ReturnType<HttpTestingController['match']>[number] | undefined;
    await vi.waitFor(() => {
      req = httpMock.match((r) => r.url === `${baseUrl}/vet-hospitals`)[0];
      if (!req) {
        throw new Error('debounced hospital search request not sent yet');
      }
    });
    req!.flush([hospital]);

    expect(component.hospitalResults()).toEqual([hospital]);

    component.selectHospital(hospital);

    expect(component.selectedHospital()).toEqual(hospital);
    expect(component.hospitalResults()).toEqual([]);
    expect(component.prescribedBy.value).toBe(hospital.id);
  });

  it('lets the user pick a different hospital after selecting one', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.selectHospital(hospital);
    expect(component.prescribedBy.value).toBe(hospital.id);

    component.changeHospital();

    expect(component.selectedHospital()).toBeNull();
    expect(component.prescribedBy.value).toBe('');
  });

  it('submits the selected hospital id as prescribedBy', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.form.patchValue({
      title: 'Rabies vaccination',
      medicalRecordTypeId: '1',
      administeredAt: '2026-01-01',
    });
    component.selectHospital(hospital);

    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animalId}/medical-records`);
    expect(req.request.body.prescribedBy).toBe(hospital.id);
    req.flush({ ...record, prescribedBy: hospital.id });
  });
});
