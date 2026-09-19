import { Routes } from '@angular/router';
import { MedicalHistory } from './medical-history/medical-history';

export const medicalRoutes: Routes = [{ path: 'animals/:id/medical-records', component: MedicalHistory }];
