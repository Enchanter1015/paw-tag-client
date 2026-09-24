import { Component, inject } from '@angular/core';
import { OfflineIndicatorService } from '../../core/services/offline-indicator.service';

@Component({
  selector: 'pt-offline-banner',
  standalone: true,
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  protected readonly offlineIndicator = inject(OfflineIndicatorService);
}
