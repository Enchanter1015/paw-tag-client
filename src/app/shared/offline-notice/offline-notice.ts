import { Component, Input, inject } from '@angular/core';
import { OfflineIndicatorService } from '../../core/services/offline-indicator.service';
import { formatDate } from '../../core/utils/medical-record-status.util';
import { PtTag } from '../pt-tag/pt-tag';

// In-page notice for screens that can fall back to the offline cache: says when the data shown
// was saved and which actions on this screen need a connection.
@Component({
  selector: 'pt-offline-notice',
  standalone: true,
  imports: [PtTag],
  templateUrl: './offline-notice.html',
  styleUrl: './offline-notice.scss',
})
export class OfflineNotice {
  protected readonly offlineIndicator = inject(OfflineIndicatorService);

  // ISO timestamp of the cached copy being shown, or null when the data is live.
  @Input() cachedAt: string | null = null;
  @Input() note = 'Changes need an internet connection.';

  formattedCachedAt(): string {
    return this.cachedAt ? formatDate(new Date(this.cachedAt)) : '';
  }
}
