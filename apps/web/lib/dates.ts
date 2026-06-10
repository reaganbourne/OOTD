/**
 * Date helpers that keep "worn on" / event dates stable across timezones.
 *
 * The core bug these solve: a date-only string like "2026-06-09" parsed with
 * `new Date("2026-06-09")` is interpreted as UTC midnight. When formatted in a
 * western timezone (e.g. America/New_York, UTC-4) that renders as the *previous*
 * day ("June 8"). Anchoring date-only values to local noon avoids the shift.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date as a local `YYYY-MM-DD` string (never UTC). */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Parse a date value into a Date suitable for *display*.
 * Date-only strings ("YYYY-MM-DD") are anchored to local noon so they never
 * cross the UTC date boundary. Full timestamps are parsed as-is.
 */
export function parseDisplayDate(value: string): Date {
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

/**
 * Format a worn / event date (date-only or full ISO) in local time.
 * Returns null for empty input so callers can conditionally render.
 */
export function formatWornDate(
  value: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", opts).format(parseDisplayDate(value));
}
