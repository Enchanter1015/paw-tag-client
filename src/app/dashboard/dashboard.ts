import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../core/services/dashboard.service';
import { PageHeaderService } from '../core/services/page-header.service';
import { DashboardStats } from '../core/models/models';
import { formatDate } from '../core/utils/medical-record-status.util';
import { PtAvatar } from '../shared/pt-avatar/pt-avatar';
import { PtButton } from '../shared/pt-button/pt-button';
import { PtCard } from '../shared/pt-card/pt-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, PtAvatar, PtButton, PtCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly vaccinationCoverage = computed(() => {
    const stats = this.stats();
    if (!stats || stats.totalAnimals === 0) {
      return null;
    }
    return Math.round((stats.vaccinatedAnimals / stats.totalAnimals) * 100);
  });

  constructor() {
    inject(PageHeaderService).set({ title: () => 'Home', left: { kind: 'none' } });
    this.load();
  }

  refresh(): void {
    this.load();
  }

  formatCreatedAt(animal: { createdAt: string }): string {
    return formatDate(new Date(animal.createdAt));
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.dashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load dashboard stats. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
