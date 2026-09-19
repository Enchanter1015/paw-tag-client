import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QrCodeService } from './qr-code.service';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('builds a profile URL from the current origin and animal id', () => {
    expect(service.animalProfileUrl('abcd1234')).toBe(`${window.location.origin}/animals/abcd1234`);
  });

  it('generates a PNG data URL encoding the profile URL', async () => {
    const dataUrl = await service.generateDataUrl('abcd1234');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('triggers a download of the generated image via a temporary anchor', async () => {
    const dataUrl = await service.generateDataUrl('abcd1234');
    const clickSpy = vi.fn();
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    service.download(dataUrl, 'abcd1234');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe(dataUrl);
    expect(anchor.download).toBe('pawtag-abcd1234.png');
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
