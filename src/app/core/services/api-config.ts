import { InjectionToken } from '@angular/core';

// Base URL for the Paw Tag API; override via provider for other environments
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'https://apps.technest.lk/paw-tag-api/api/v1'
});
