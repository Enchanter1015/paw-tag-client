import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { ApiError } from '../models/models';
import { OfflineIndicatorService } from './offline-indicator.service';

export const OFFLINE_ERROR_CODE = 'OFFLINE';
export const OFFLINE_ERROR_MESSAGE = "You're offline. Connect to the internet and try again.";

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Fails write requests immediately while the device is offline, with an ApiError-shaped body so
// every form's existing `apiError.error.message` handling shows a clear offline message instead
// of a generic failure. Reads still go out so the service worker / offline cache can answer them.
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const offlineIndicator = inject(OfflineIndicatorService);

  if (offlineIndicator.offline() && !READ_METHODS.has(req.method)) {
    const body: ApiError = { error: { code: OFFLINE_ERROR_CODE, message: OFFLINE_ERROR_MESSAGE } };
    return throwError(
      () => new HttpErrorResponse({ status: 0, statusText: 'Offline', url: req.urlWithParams, error: body })
    );
  }

  return next(req);
};
