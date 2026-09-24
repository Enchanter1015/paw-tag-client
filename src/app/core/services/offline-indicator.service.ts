import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

// Tracks browser connectivity via navigator.onLine plus the window online/offline events so any
// screen can react (banner, blocked write actions) without polling.
@Injectable({ providedIn: 'root' })
export class OfflineIndicatorService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly _online = signal(this.window?.navigator.onLine ?? true);

  readonly online = this._online.asReadonly();
  readonly offline = computed(() => !this._online());

  constructor() {
    if (!this.window) {
      return;
    }
    const setOnline = () => this._online.set(true);
    const setOffline = () => this._online.set(false);
    this.window.addEventListener('online', setOnline);
    this.window.addEventListener('offline', setOffline);

    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('online', setOnline);
      this.window?.removeEventListener('offline', setOffline);
    });
  }
}
