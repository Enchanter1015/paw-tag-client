import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import {
  CreateMedicalRecordInput,
  MedicalRecord,
  UpdateMedicalRecordInput,
  VerifyMedicalRecordInput
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class MedicalRecordsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  addForAnimal(animalId: string, input: CreateMedicalRecordInput): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(`${this.baseUrl}/animals/${animalId}/medical-records`, input);
  }

  listForAnimal(animalId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.baseUrl}/animals/${animalId}/medical-records`);
  }

  getById(id: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.baseUrl}/medical-records/${id}`);
  }

  update(id: string, input: UpdateMedicalRecordInput): Observable<MedicalRecord> {
    return this.http.patch<MedicalRecord>(`${this.baseUrl}/medical-records/${id}`, input);
  }

  verify(id: string, input: VerifyMedicalRecordInput): Observable<MedicalRecord> {
    return this.http.patch<MedicalRecord>(`${this.baseUrl}/medical-records/${id}/verify`, input);
  }
}
