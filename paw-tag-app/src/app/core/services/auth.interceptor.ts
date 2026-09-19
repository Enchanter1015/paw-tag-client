import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { AuthStateService } from './auth-state.service';

// Auth endpoints handle their own error responses (e.g. inline 401/409 messages); skip global handling for them.
const AUTH_ENDPOINT_PATTERN = /\/auth\/(login|register|refresh|logout)$/;

// Attaches the bearer access token to every outgoing request when present,
// and on a 401 from any other endpoint clears the session and redirects to /login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const accessToken = tokenStorage.getAccessToken();

  const authedReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !AUTH_ENDPOINT_PATTERN.test(req.url)
      ) {
        tokenStorage.clear();
        authState.refresh();
        router.navigateByUrl(
          router.createUrlTree(['/login'], { queryParams: { redirectTo: router.url } })
        );
      }

      return throwError(() => error);
    })
  );
};
