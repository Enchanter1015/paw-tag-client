import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnimalQr } from './animal-qr';
import { API_BASE_URL } from '../../core/services/api-config';
import { Animal } from '../../core/models/models';

describe('AnimalQr', () => {
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnimalQr],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: animal.id }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders a generated QR code image for the animal once loaded', async () => {
    const fixture = TestBed.createComponent(AnimalQr);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(animal);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      const img = fixture.nativeElement.querySelector('img.animal-qr-image');
      expect(img?.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    });

    expect(fixture.nativeElement.textContent).toContain('Rex');
  });

  it('shows a not-found message when the animal does not exist', () => {
    const fixture = TestBed.createComponent(AnimalQr);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${baseUrl}/animals/${animal.id}`);
    req.flush({ error: { code: 'NOT_FOUND', message: 'Animal not found' } }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Animal not found');
  });

  it('downloads the QR code image via the QrCodeService', async () => {
    const fixture = TestBed.createComponent(AnimalQr);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/animals/${animal.id}`).flush(animal);
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.qrDataUrl()).not.toBeNull();
    });

    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    fixture.componentInstance.download();

    expect(anchor.download).toBe(`pawtag-${animal.id}.png`);
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
