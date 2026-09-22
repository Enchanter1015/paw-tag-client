import { PtTagVariant } from '../../shared/pt-tag/pt-tag';
import { MedicalRecord } from '../models/models';

export interface DueStatus {
  label: string;
  variant: PtTagVariant;
}

// A due date inside this window reads as "Due soon" rather than "Up to date" — no tokens.json
// ships in this repo to source the exact threshold from, so 30 days is a reasonable default.
const DUE_SOON_WINDOW_DAYS = 30;

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A record with no next due date has no status. Status is a bare word (never a date baked into
// the label, per the design system's tag convention) — dates belong in the row's meta text.
export function getDueStatus(record: Pick<MedicalRecord, 'nextDueDate'>): DueStatus | null {
  if (!record.nextDueDate) {
    return null;
  }
  const dueDate = new Date(record.nextDueDate);
  const msUntilDue = dueDate.getTime() - Date.now();

  if (msUntilDue < 0) {
    return { label: 'Overdue', variant: 'danger' };
  }
  if (msUntilDue <= DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return { label: 'Due soon', variant: 'warning' };
  }
  return { label: 'Up to date', variant: 'success' };
}

export function sortByAdministeredAtDesc(records: MedicalRecord[]): MedicalRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime()
  );
}
