import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class HealthService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  checkLive(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  checkReady(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/health/ready`);
  }
}
