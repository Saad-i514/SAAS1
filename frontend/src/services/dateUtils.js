/**
 * Date display utilities.
 *
 * Problem: Dates are stored as UTC in the database. When JavaScript parses
 * an ISO string like "2026-05-22T20:00:00" with `new Date()`, it treats it
 * as UTC and then `toLocaleDateString()` shifts it to the browser's local
 * timezone (PKT = UTC+5), making May 22 appear as May 23.
 *
 * Fix: Parse only the date portion (YYYY-MM-DD) so no timezone shift occurs.
 */

/**
 * Format a date string or Date object as a local date string.
 * Strips the time component before parsing to avoid UTC→local shift.
 *
 * @param {string|Date|null} value
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function fmtDate(value, opts) {
  if (!value) return '—';
  try {
    // If it's already a Date object, format it directly (already in local time)
    if (value instanceof Date) {
      return value.toLocaleDateString(undefined, opts);
    }
    // Extract YYYY-MM-DD from ISO string to avoid UTC shift
    const dateStr = String(value).slice(0, 10); // "2026-05-22"
    const [year, month, day] = dateStr.split('-').map(Number);
    // Construct date in LOCAL time (no UTC conversion)
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(undefined, opts);
  } catch {
    return String(value);
  }
}

/**
 * Format as short date: "May 22, 2026"
 */
export function fmtDateLong(value) {
  return fmtDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format as numeric: "5/22/2026"
 */
export function fmtDateShort(value) {
  return fmtDate(value);
}
