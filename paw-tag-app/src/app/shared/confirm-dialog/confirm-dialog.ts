import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PtButton } from '../pt-button/pt-button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [PtButton],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;

  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
}
