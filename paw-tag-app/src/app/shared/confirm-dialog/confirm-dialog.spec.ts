import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  function createComponent() {
    TestBed.configureTestingModule({ imports: [ConfirmDialog] });
    const fixture = TestBed.createComponent(ConfirmDialog);
    return fixture;
  }

  it('renders nothing when closed', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm-dialog')).toBeNull();
  });

  it('renders the title and message when open, and emits on confirm/cancel', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.open = true;
    component.title = 'Remove this animal?';
    component.message = 'This cannot be undone.';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Remove this animal?');
    expect(fixture.nativeElement.textContent).toContain('This cannot be undone.');

    let confirmed = false;
    let cancelled = false;
    component.confirmed.subscribe(() => (confirmed = true));
    component.cancelled.subscribe(() => (cancelled = true));

    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    expect(cancelled).toBe(true);

    (buttons[1] as HTMLButtonElement).click();
    expect(confirmed).toBe(true);
  });
});
