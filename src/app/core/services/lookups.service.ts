import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { Lookup } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LookupsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  getAnimalTypes(): Observable<Lookup[]> {
    return this.http.get<Lookup[]>(`${this.baseUrl}/animal-types`);
  }

  getMedicalRecordTypes(): Observable<Lookup[]> {
    return this.http.get<Lookup[]>(`${this.baseUrl}/medical-record-types`);
  }

  getVetHospitalTypes(): Observable<Lookup[]> {
    return this.http.get<Lookup[]>(`${this.baseUrl}/vet-hospital-types`);
  }

  getRoles(): Observable<Lookup[]> {
    return this.http.get<Lookup[]>(`${this.baseUrl}/roles`);
  }
}
