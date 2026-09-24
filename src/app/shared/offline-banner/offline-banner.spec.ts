import { TestBed } from '@angular/core/testing';
import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  afterEach(() => window.dispatchEvent(new Event('online')));

  it('renders nothing while online', () => {
    const fixture = TestBed.createComponent(OfflineBanner);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pt-offline-banner')).toBeNull();
  });

  it('shows the banner when the device goes offline and hides it on reconnect', () => {
    const fixture = TestBed.createComponent(OfflineBanner);
    fixture.detectChanges();

    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.pt-offline-banner') as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toContain("You're offline");

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pt-offline-banner')).toBeNull();
  });
});
