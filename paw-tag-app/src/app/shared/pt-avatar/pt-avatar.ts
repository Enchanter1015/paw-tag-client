import { Component, Input, computed, signal } from '@angular/core';

export type PtAvatarSize = 'md' | 'lg';

@Component({
  selector: 'pt-avatar',
  standalone: true,
  template: `<span class="pt-avatar" [class.pt-avatar--lg]="size === 'lg'">{{ initials() }}</span>`,
  styleUrl: './pt-avatar.scss',
})
export class PtAvatar {
  @Input() size: PtAvatarSize = 'md';

  private readonly nameSignal = signal('');

  @Input()
  set name(value: string) {
    this.nameSignal.set(value ?? '');
  }

  readonly initials = computed(() => {
    const parts = this.nameSignal()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  });
}
