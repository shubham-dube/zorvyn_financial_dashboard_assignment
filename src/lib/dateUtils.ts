import { parseISO, isAfter, addDays, format } from 'date-fns';

export function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = parseISO(dateStr);
  return !isNaN(date.getTime());
}

// Compatibility alias used by existing schema modules.
export function isValidDate(dateStr: string): boolean {
  return isValidDateString(dateStr);
}

export function isFutureDate(dateStr: string, maxDays: number = 365): boolean {
  const date = parseISO(dateStr);
  const maxFutureDate = addDays(new Date(), maxDays);
  return isAfter(date, maxFutureDate);
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayString(): string {
  return formatDate(new Date());
}
