import { Component, Input } from '@angular/core';

export type PtTagVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'pt-tag',
  standalone: true,
  template: `<span class="pt-tag" [class]="'pt-tag--' + variant"><ng-content></ng-content></span>`,
  styleUrl: './pt-tag.scss',
})
export class PtTag {
  @Input() variant: PtTagVariant = 'neutral';
}
