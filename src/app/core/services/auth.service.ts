import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { TokenStorageService } from './token-storage.service';
import { AuthStateService } from './auth-state.service';
import { OfflineCacheService } from './offline-cache.service';
import { LoginInput, LogoutInput, RefreshInput, RegisterInput, TokenPair } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly offlineCache = inject(OfflineCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly authState: AuthStateService,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  register(input: RegisterInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/register`, input)
      .pipe(tap((tokens) => this.storeAndRefresh(tokens)));
  }

  login(input: LoginInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/login`, input)
      .pipe(tap((tokens) => this.storeAndRefresh(tokens)));
  }

  refresh(input: RefreshInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/refresh`, input)
      .pipe(tap((tokens) => this.storeAndRefresh(tokens)));
  }

  private storeAndRefresh(tokens: TokenPair): void {
    this.tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    this.authState.refresh();
  }

  logout(input: LogoutInput): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, input).pipe(
      tap(() => {
        this.tokenStorage.clear();
        // Cached profiles include owner contact details — don't leave them behind for the next user.
        this.offlineCache.clear();
        this.authState.refresh();
      })
    );
  }
}
