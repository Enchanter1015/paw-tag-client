import { Component } from '@angular/core';

@Component({
  selector: 'pt-card',
  standalone: true,
  template: `<div class="pt-card"><ng-content></ng-content></div>`,
  styleUrl: './pt-card.scss',
})
export class PtCard {}
