// All ride times are stored as UTC instants and shown in the team's time zone.

function parts(date: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

/** "2026-10-30" in the team's zone. */
export function localDateKey(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "4:10 PM" */
export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}

/** "Friday, Oct 30" */
export function formatDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric" }).format(date);
}

/** "FRI" and "30" for the date tiles. */
export function dateTile(date: Date, timeZone: string): { weekday: string; day: string } {
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" }).format(date),
  };
}

/** Adds whole days to a "YYYY-MM-DD" key without touching time zones. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Monday of the week that contains the given "YYYY-MM-DD" key. */
export function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(key, -((weekday + 6) % 7));
}

/** Weekday and day number for a "YYYY-MM-DD" key, independent of zone. */
export function keyLabel(key: string): { weekday: string; day: string; long: string } {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(date);
  return {
    weekday: fmt({ weekday: "short" }),
    day: fmt({ day: "numeric" }),
    long: fmt({ weekday: "long", month: "short", day: "numeric" }),
  };
}

/** Value for <input type="datetime-local"> some hours from now in the team's zone. */
export function localInputValue(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function isValidLocalDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}
