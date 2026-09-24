import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { OfflineIndicatorService } from './offline-indicator.service';

describe('OfflineIndicatorService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts online when navigator reports online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const service = TestBed.inject(OfflineIndicatorService);

    expect(service.online()).toBe(true);
    expect(service.offline()).toBe(false);
  });

  it('starts offline when navigator reports offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const service = TestBed.inject(OfflineIndicatorService);

    expect(service.online()).toBe(false);
    expect(service.offline()).toBe(true);
  });

  it('switches to offline on the window offline event and back on the online event', () => {
    const service = TestBed.inject(OfflineIndicatorService);

    window.dispatchEvent(new Event('offline'));
    expect(service.offline()).toBe(true);

    window.dispatchEvent(new Event('online'));
    expect(service.offline()).toBe(false);
    expect(service.online()).toBe(true);
  });

  it('stays offline across repeated offline events', () => {
    const service = TestBed.inject(OfflineIndicatorService);

    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('offline'));

    expect(service.offline()).toBe(true);
    window.dispatchEvent(new Event('online'));
  });

  it('stops listening to window events once destroyed', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const service = TestBed.inject(OfflineIndicatorService);

    TestBed.resetTestingModule();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    window.dispatchEvent(new Event('offline'));
    expect(service.offline()).toBe(false);
    window.dispatchEvent(new Event('online'));
  });
});
