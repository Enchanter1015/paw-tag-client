import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { AnimalImage, MedicalRecordImage } from '../models/models';

const toFormData = (files: File[]): FormData => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  return formData;
};

@Injectable({ providedIn: 'root' })
export class ImagesService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string
  ) {}

  uploadAnimalImages(animalId: string, files: File[]): Observable<AnimalImage[]> {
    return this.http.post<AnimalImage[]>(`${this.baseUrl}/animals/${animalId}/images`, toFormData(files));
  }

  uploadMedicalRecordImages(medicalRecordId: string, files: File[]): Observable<MedicalRecordImage[]> {
    return this.http.post<MedicalRecordImage[]>(
      `${this.baseUrl}/medical-records/${medicalRecordId}/images`,
      toFormData(files)
    );
  }
}
