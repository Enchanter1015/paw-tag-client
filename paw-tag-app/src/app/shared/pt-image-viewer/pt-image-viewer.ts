import { Component, EventEmitter, Input, Output } from '@angular/core';
import { onImageError } from '../../core/utils/image-placeholder.util';

@Component({
  selector: 'pt-image-viewer',
  standalone: true,
  templateUrl: './pt-image-viewer.html',
  styleUrl: './pt-image-viewer.scss',
})
export class PtImageViewer {
  @Input() url: string | null = null;
  @Input() alt = '';

  @Output() readonly closed = new EventEmitter<void>();

  protected readonly onImageError = onImageError;
}
