import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/services/auth.interceptor';
import { offlineInterceptor } from './core/services/offline.interceptor';

// Service workers only register over http(s); the Cordova build is served from file:// and relies
// on OfflineCacheService instead.
const canUseServiceWorker = typeof location !== 'undefined' && location.protocol.startsWith('http');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([offlineInterceptor, authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && canUseServiceWorker,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
