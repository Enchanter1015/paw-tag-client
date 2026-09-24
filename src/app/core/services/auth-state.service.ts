import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { OfflineIndicatorService } from './offline-indicator.service';
import { decodeJwtPayload } from './jwt.util';
import { AuthUser } from '../models/models';

// Derives the current user/role from the stored access token; call refresh() after login/logout
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly offlineIndicator = inject(OfflineIndicatorService);
  private readonly userSubject: BehaviorSubject<AuthUser | null>;
  readonly currentUser$;

  constructor(private readonly tokenStorage: TokenStorageService) {
    this.userSubject = new BehaviorSubject<AuthUser | null>(this.readUser());
    this.currentUser$ = this.userSubject.asObservable();
  }

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isGuest(): boolean {
    return !this.isAuthenticated();
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  // Case-insensitive match on "admin" since backend role names are inconsistently cased/duplicated
  // (e.g. "Admin" and "admin" both exist) rather than the clean "Administrator" tier the design assumes.
  isAdministrator(): boolean {
    return /admin/i.test(this.currentUser?.role ?? '');
  }

  refresh(): void {
    this.userSubject.next(this.readUser());
  }

  private readUser(): AuthUser | null {
    const token = this.tokenStorage.getAccessToken();
    if (!token) {
      return null;
    }

    const payload = decodeJwtPayload<AuthUser>(token);
    if (!payload) {
      return null;
    }

    // An expired token can't be renewed without a connection, so offline the stored session stays
    // usable for reading cached data; once back online the API's 401 sends the user to /login.
    if (payload.exp && payload.exp * 1000 < Date.now() && !this.offlineIndicator.offline()) {
      return null;
    }

    return payload;
  }
}
