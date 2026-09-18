import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { Animal, AnimalSearchParams, CreateAnimalInput, MergeAnimalInput, UpdateAnimalInput } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AnimalsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  register(input: CreateAnimalInput): Observable<Animal> {
    return this.http.post<Animal>(`${this.baseUrl}/animals`, input);
  }

  search(params: AnimalSearchParams = {}): Observable<Animal[]> {
    let httpParams = new HttpParams();
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.animalTypeId != null) httpParams = httpParams.set('animalTypeId', params.animalTypeId);
    if (params.isStreet != null) httpParams = httpParams.set('isStreet', params.isStreet);

    return this.http.get<Animal[]>(`${this.baseUrl}/animals`, { params: httpParams });
  }

  getById(id: string): Observable<Animal> {
    return this.http.get<Animal>(`${this.baseUrl}/animals/${id}`);
  }

  update(id: string, input: UpdateAnimalInput): Observable<Animal> {
    return this.http.patch<Animal>(`${this.baseUrl}/animals/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/animals/${id}`);
  }

  merge(id: string, input: MergeAnimalInput): Observable<Animal> {
    return this.http.post<Animal>(`${this.baseUrl}/animals/${id}/merge`, input);
  }
}
