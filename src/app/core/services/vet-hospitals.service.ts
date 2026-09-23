import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import {
  AddVetHospitalMemberInput,
  CreateVetHospitalInput,
  UpdateVetHospitalInput,
  UpdateVetHospitalMemberInput,
  VetHospital,
  VetHospitalMember
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class VetHospitalsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  register(input: CreateVetHospitalInput): Observable<VetHospital> {
    return this.http.post<VetHospital>(`${this.baseUrl}/vet-hospitals`, input);
  }

  search(name?: string): Observable<VetHospital[]> {
    let params = new HttpParams();
    if (name) params = params.set('name', name);
    return this.http.get<VetHospital[]>(`${this.baseUrl}/vet-hospitals`, { params });
  }

  getById(id: string): Observable<VetHospital> {
    return this.http.get<VetHospital>(`${this.baseUrl}/vet-hospitals/${id}`);
  }

  update(id: string, input: UpdateVetHospitalInput): Observable<VetHospital> {
    return this.http.patch<VetHospital>(`${this.baseUrl}/vet-hospitals/${id}`, input);
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vet-hospitals/${id}`);
  }

  addMember(id: string, input: AddVetHospitalMemberInput): Observable<VetHospitalMember> {
    return this.http.post<VetHospitalMember>(`${this.baseUrl}/vet-hospitals/${id}/members`, input);
  }

  listMembers(id: string): Observable<VetHospitalMember[]> {
    return this.http.get<VetHospitalMember[]>(`${this.baseUrl}/vet-hospitals/${id}/members`);
  }

  updateMember(id: string, memberId: string, input: UpdateVetHospitalMemberInput): Observable<VetHospitalMember> {
    return this.http.patch<VetHospitalMember>(`${this.baseUrl}/vet-hospitals/${id}/members/${memberId}`, input);
  }

  removeMember(id: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vet-hospitals/${id}/members/${memberId}`);
  }
}
