// Wall-clock helpers. Times of day are 'HH:MM' strings, handled as minutes since midnight.

export function parseHM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

export function formatHM(mins: number): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// The quiet window runs from bedtime until 05:00, across midnight if needed.
export const QUIET_END_MINS = 5 * 60;

export function inQuietWindow(minuteOfDay: number, bedtimeMins: number): boolean {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  if (bedtimeMins >= QUIET_END_MINS) return m >= bedtimeMins || m < QUIET_END_MINS;
  return m >= bedtimeMins && m < QUIET_END_MINS;
}

export function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60_000);
}
