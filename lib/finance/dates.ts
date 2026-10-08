/**
 * Date helpers that work in the user's LOCAL calendar.
 *
 * Postgres DATE columns come back as "YYYY-MM-DD". `new Date("2026-10-07")`
 * parses that as UTC midnight, which is the previous evening in Virginia —
 * so these helpers always parse date-only strings as local dates.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse "YYYY-MM-DD" (or a full timestamp) into a local Date. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseDate(iso) || new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** "2026-10" */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(key: string, style: "short" | "long" = "short"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: style, year: "2-digit" });
}

export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** Inclusive overlap in days between [aStart,aEnd] and [bStart,bEnd]. */
export function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (end < start) return 0;
  return daysBetween(start, end) + 1;
}

/** Number of Mon–Fri days in an inclusive range. */
export function businessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function fiscalYearStart(today: Date, fiscalStartMonth: number): Date {
  // fiscalStartMonth: 1 = January … 12 = December
  const m = Math.min(12, Math.max(1, fiscalStartMonth || 1)) - 1;
  const year = today.getMonth() >= m ? today.getFullYear() : today.getFullYear() - 1;
  return new Date(year, m, 1);
}
