import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QrScanner } from './qr-scanner';

describe('QrScanner', () => {
  function createComponent() {
    const fixture = TestBed.createComponent(QrScanner);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
  });

  it('extracts a bare animal id unchanged', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.extractAnimalId('abcd1234')).toBe('abcd1234');
  });

  it('extracts the animal id from a profile URL payload', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.extractAnimalId('https://pawtag.example/animals/abcd1234')).toBe('abcd1234');
  });

  it('emits a cameraError when the browser has no camera support', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    const fixture = createComponent();
    const errorSpy = vi.fn();
    fixture.componentInstance.cameraError.subscribe(errorSpy);

    await fixture.componentInstance.start();

    expect(errorSpy).toHaveBeenCalledWith('Camera access is not available on this device.');
  });

  it('emits a cameraError when camera permission is denied', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const fixture = createComponent();
    const errorSpy = vi.fn();
    fixture.componentInstance.cameraError.subscribe(errorSpy);

    await fixture.componentInstance.start();

    expect(errorSpy).toHaveBeenCalledWith('Camera permission was denied. Enter the animal ID manually instead.');
  });

  it('releases the camera if stop() runs while getUserMedia is still pending', async () => {
    const trackStop = vi.fn();
    let resolveStream!: (stream: MediaStream) => void;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockReturnValue(new Promise((r) => (resolveStream = r))) },
      configurable: true,
    });
    const fixture = createComponent();
    const scanner = fixture.componentInstance;

    const started = scanner.start();
    await Promise.resolve();
    scanner.stop();
    resolveStream({ getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream);
    await started;

    expect(trackStop).toHaveBeenCalled();
    expect(scanner.active()).toBe(false);
  });

  it('emits a cameraError and releases the camera when the preview fails to play', async () => {
    const trackStop = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }),
      },
      configurable: true,
    });
    const fixture = createComponent();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    video.play = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const errorSpy = vi.fn();
    fixture.componentInstance.cameraError.subscribe(errorSpy);

    await fixture.componentInstance.start();

    expect(errorSpy).toHaveBeenCalledWith('Camera preview is unavailable.');
    expect(trackStop).toHaveBeenCalled();
    expect(fixture.componentInstance.active()).toBe(false);
  });

  it('stop() is safe to call when no stream was ever started', () => {
    const fixture = createComponent();
    expect(() => fixture.componentInstance.stop()).not.toThrow();
    expect(fixture.componentInstance.active()).toBe(false);
  });
});
