import { Component, Input } from '@angular/core';

export type PtButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Component({
  selector: 'pt-button',
  standalone: true,
  templateUrl: './pt-button.html',
  styleUrl: './pt-button.scss',
})
export class PtButton {
  @Input() variant: PtButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() full = false;
}
