import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { TokenStorageService } from './token-storage.service';
import { LoginInput, LogoutInput, RefreshInput, RegisterInput, TokenPair } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  register(input: RegisterInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/register`, input)
      .pipe(tap((tokens) => this.tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)));
  }

  login(input: LoginInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/login`, input)
      .pipe(tap((tokens) => this.tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)));
  }

  refresh(input: RefreshInput): Observable<TokenPair> {
    return this.http
      .post<TokenPair>(`${this.baseUrl}/auth/refresh`, input)
      .pipe(tap((tokens) => this.tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)));
  }

  logout(input: LogoutInput): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, input)
      .pipe(tap(() => this.tokenStorage.clear()));
  }
}
