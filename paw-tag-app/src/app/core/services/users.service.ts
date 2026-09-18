import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { CreateUserInput, UpdateUserInput, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  register(input: CreateUserInput): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, input);
  }

  findByEmail(email: string): Observable<User> {
    const params = new HttpParams().set('email', email);
    return this.http.get<User>(`${this.baseUrl}/users`, { params });
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  update(id: string, input: UpdateUserInput): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, input);
  }
}
