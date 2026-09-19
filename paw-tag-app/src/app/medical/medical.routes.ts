import { Routes } from '@angular/router';
import { MedicalHistory } from './medical-history/medical-history';
import { MedicalRecordView } from './medical-record-view/medical-record-view';

// Static paths must come before the dynamic ':recordId' route, otherwise it would swallow them.
export const medicalRoutes: Routes = [
  { path: 'animals/:id/medical-records', component: MedicalHistory },
  { path: 'animals/:id/medical-records/:recordId', component: MedicalRecordView },
];
