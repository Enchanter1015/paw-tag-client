import { Component, inject } from '@angular/core';
import { PageHeaderService } from '../core/services/page-header.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  constructor() {
    inject(PageHeaderService).set({ title: () => 'Home', left: { kind: 'none' } });
  }
}
