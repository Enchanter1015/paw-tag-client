import { TestBed } from '@angular/core/testing';
import { PlatformService, isCordova, isWebPlatform } from './platform.service';

describe('PlatformService and platform helpers', () => {
  let service: PlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformService],
    });
    service = TestBed.inject(PlatformService);
  });

  afterEach(() => {
    delete (window as any).cordova;
  });

  it('detects web platform when window.cordova is undefined', () => {
    delete (window as any).cordova;
    expect(isCordova()).toBe(false);
    expect(isWebPlatform()).toBe(true);
    expect(service.isCordova()).toBe(false);
    expect(service.isWeb()).toBe(true);
  });

  it('detects cordova platform when window.cordova is present', () => {
    (window as any).cordova = { plugins: {} };
    expect(isCordova()).toBe(true);
    expect(isWebPlatform()).toBe(false);
    expect(service.isCordova()).toBe(true);
    expect(service.isWeb()).toBe(false);
  });
});
