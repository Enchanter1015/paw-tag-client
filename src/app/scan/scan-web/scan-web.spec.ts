import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ScanWeb } from './scan-web';
import { API_BASE_URL } from '../../core/services/api-config';
import { Animal } from '../../core/models/models';

describe('ScanWeb', () => {
  const baseUrl = 'http://localhost:3000/api/v1';
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
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ScanWeb],
      providers: [
        provideRouter([{ path: 'animals/:id', component: ScanWeb }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('resolves a manually entered animal id and navigates to its profile', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    const navigateSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ animalId: animal.id });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush(animal);

    expect(navigateSpy).toHaveBeenCalledWith(['/animals', animal.id]);
  });

  it('shows a retryable error when the entered id does not resolve', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ animalId: 'unknown-id' });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${baseUrl}/animals/unknown-id`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance.lookupError()).toContain('unknown-id');
    expect(fixture.nativeElement.textContent).toContain('Try again');

    fixture.componentInstance.retry();
    expect(fixture.componentInstance.lookupError()).toBeNull();
  });

  it('does not submit while the animal id field is empty', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    httpMock.expectNone(`${baseUrl}/animals/`);
    expect(fixture.componentInstance.animalId.touched).toBe(true);
  });

  it('resolves a scanned id from the camera scanner and navigates to its profile', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    const navigateSpy = vi.spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.onScanned(animal.id);

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush(animal);

    expect(navigateSpy).toHaveBeenCalledWith(['/animals', animal.id]);
    expect(fixture.componentInstance.cameraOpen()).toBe(false);
  });

  it('hides the manual-entry form until "Enter animal ID manually instead" is clicked', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form.scan-form')).toBeNull();

    const manualLink = fixture.nativeElement.querySelector('.scan-manual-link') as HTMLButtonElement;
    expect(manualLink).toBeTruthy();
    manualLink.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form.scan-form')).toBeTruthy();
  });

  it('starts the camera scan when the target circle is clicked', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    fixture.detectChanges();

    const target = fixture.nativeElement.querySelector('.scan-target') as HTMLButtonElement;
    target.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.cameraOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-qr-scanner')).toBeTruthy();
  });

  it('surfaces a camera error and falls back to manual entry', () => {
    const fixture = TestBed.createComponent(ScanWeb);
    fixture.detectChanges();

    fixture.componentInstance.onCameraError('Camera permission was denied. Enter the animal ID manually instead.');
    fixture.detectChanges();

    expect(fixture.componentInstance.cameraOpen()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Enter the animal ID manually instead');
  });
});
