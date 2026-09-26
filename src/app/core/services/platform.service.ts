import { Injectable } from '@angular/core';

/**
 * Returns true if running inside a Cordova / mobile WebView container.
 * Reuses the Cordova global check found across the app.
 */
export function isCordova(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { cordova?: unknown }).cordova);
}

/**
 * Returns true if running as a standard web browser client.
 */
export function isWebPlatform(): boolean {
  return !isCordova();
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  isCordova(): boolean {
    return isCordova();
  }

  isWeb(): boolean {
    return isWebPlatform();
  }
}
