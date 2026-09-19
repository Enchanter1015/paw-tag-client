import { PtTagVariant } from '../../shared/pt-tag/pt-tag';
import { MedicalRecord } from '../models/models';

export interface DueStatus {
  label: string;
  variant: PtTagVariant;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A record with no next due date has no status. One whose due date has passed is overdue;
// otherwise it's due (stated as fact + date, never an alarm, per the design system copy rules).
export function getDueStatus(record: Pick<MedicalRecord, 'nextDueDate'>): DueStatus | null {
  if (!record.nextDueDate) {
    return null;
  }
  const dueDate = new Date(record.nextDueDate);
  const formatted = formatDate(dueDate);

  if (dueDate.getTime() < Date.now()) {
    return { label: `Overdue since ${formatted}`, variant: 'danger' };
  }
  return { label: `Due ${formatted}`, variant: 'warning' };
}

export function sortByAdministeredAtDesc(records: MedicalRecord[]): MedicalRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime()
  );
}
