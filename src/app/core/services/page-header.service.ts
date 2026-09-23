import { Injectable, signal } from '@angular/core';

export type PageHeaderLeft = { kind: 'back' } | { kind: 'close'; onClick: () => void } | { kind: 'none' };

export type PageHeaderAction =
  | { kind: 'edit'; onClick: () => void }
  | { kind: 'save'; label: () => string; disabled: () => boolean; onClick: () => void }
  | { kind: 'tag'; label: string };

export interface PageHeaderConfig {
  // Functions, not plain values, so a page can hand over a live reference (e.g. an animal's
  // name signal) and have the top bar stay in sync without re-calling set() on every change.
  title: () => string;
  left: PageHeaderLeft;
  action?: PageHeaderAction;
}

const DEFAULT_CONFIG: PageHeaderConfig = { title: () => 'PawTag', left: { kind: 'none' } };

@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  private readonly _config = signal<PageHeaderConfig>(DEFAULT_CONFIG);
  readonly config = this._config.asReadonly();

  set(config: PageHeaderConfig): void {
    this._config.set(config);
  }

  reset(): void {
    this._config.set(DEFAULT_CONFIG);
  }
}
