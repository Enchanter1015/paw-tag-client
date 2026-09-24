import { TestBed } from '@angular/core/testing';
import { OfflineNotice } from './offline-notice';

describe('OfflineNotice', () => {
  afterEach(() => window.dispatchEvent(new Event('online')));

  function createComponent(inputs: { cachedAt?: string | null; note?: string } = {}) {
    const fixture = TestBed.createComponent(OfflineNotice);
    if (inputs.cachedAt !== undefined) {
      fixture.componentRef.setInput('cachedAt', inputs.cachedAt);
    }
    if (inputs.note !== undefined) {
      fixture.componentRef.setInput('note', inputs.note);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing for live data while online', () => {
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelector('.pt-offline-notice')).toBeNull();
  });

  it('shows the saved date and the default note for cached data', () => {
    const fixture = createComponent({ cachedAt: '2026-03-12T10:00:00Z' });

    const notice = fixture.nativeElement.querySelector('.pt-offline-notice') as HTMLElement;
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toContain('Offline');
    expect(notice.textContent).toContain('Showing details saved on this device on 12 Mar 2026.');
    expect(notice.textContent).toContain('Changes need an internet connection.');
  });

  it('shows a custom note', () => {
    const fixture = createComponent({ cachedAt: '2026-03-12T10:00:00Z', note: 'Adding photos needs an internet connection.' });

    expect(fixture.nativeElement.textContent).toContain('Adding photos needs an internet connection.');
    expect(fixture.nativeElement.textContent).not.toContain('Changes need an internet connection.');
  });

  it('shows only the note while offline when the data shown is not from the cache', () => {
    const fixture = createComponent();

    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    const notice = fixture.nativeElement.querySelector('.pt-offline-notice') as HTMLElement;
    expect(notice.textContent).toContain('Changes need an internet connection.');
    expect(notice.textContent).not.toContain('Showing details saved');
  });
});
