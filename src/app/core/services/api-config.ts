import { InjectionToken } from '@angular/core';

// Base URL for the Paw Tag API; override via provider for other environments
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000/api/v1'
});
