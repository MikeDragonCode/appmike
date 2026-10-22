import { dateToStr, isRestDay } from './bank';
import { MIN_SLOT_MINS, availableMins, bookSlot, glowCost, nextOpenSlot } from './slots';
import { addMinutes, minutesOfDay, parseHM } from './time';
import { HabitItem, UserData } from './types';

// "Your usual": one rest, ready to book with a single tap. It is the rest the person actually takes most
// (last 30 days), for the length they usually take it, at a sensible time tonight. Nothing is shown when
// there is nothing to pick, when something is already booked, or when it would not fit.
export interface RestPick {
  habit: HabitItem;
  mins: number;
  startsAt: Date;
}

const LOOKBACK_DAYS = 30;
const STEP = 5;

function nextQuarter(from: Date): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

export function tonightsPick(data: UserData, now: Date): RestPick | null {
  if (nextOpenSlot(data)) return null;
  const rest = data.habits.filter((h) => h.type === 'glow' && h.valueType === 'duration' && !h.archived);
  if (rest.length === 0) return null;

  const since = addMinutes(now, -LOOKBACK_DAYS * 24 * 60).getTime();
  const taken = data.slots.filter((s) => (s.state === 'done' || s.state === 'partial') && new Date(s.startsAt).getTime() >= since);
  const counts = new Map<string, number>();
  for (const s of taken) counts.set(s.habitId, (counts.get(s.habitId) ?? 0) + 1);
  const favourite = [...rest].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0];

  // The length they usually book it for: the most common, the later one on a tie.
  const lengths = new Map<number, number>();
  for (const s of taken.filter((x) => x.habitId === favourite.id)) lengths.set(s.plannedMins, (lengths.get(s.plannedMins) ?? 0) + 1);
  let usual = data.profile.defaultSlotMins;
  let best = 0;
  for (const [mins, n] of lengths) {
    if (n >= best) {
      best = n;
      usual = mins;
    }
  }

  // Never more than the bank holds.
  const avail = availableMins(data);
  const restDay = (d: Date) => isRestDay(data, d);
  let mins = usual;

  // Tonight: after work ends, at least half an hour from now, on a quarter hour.
  let start = nextQuarter(addMinutes(now, 30));
  const workEnd = new Date(now);
  workEnd.setHours(0, parseHM(data.profile.workEnd), 0, 0);
  if (start.getTime() < workEnd.getTime()) start = workEnd;

  while (mins >= MIN_SLOT_MINS && glowCost(favourite, mins, restDay(start)) > avail) mins -= STEP;
  if (mins < MIN_SLOT_MINS) return null;

  const r = bookSlot(data, { id: 'pick', habitId: favourite.id, plannedMins: mins, startsAt: start, now });
  if (!r.ok) return null;
  // Past the evening, the same day makes no sense.
  if (dateToStr(start) !== dateToStr(now) || minutesOfDay(start) < 5 * 60) return null;
  return { habit: favourite, mins, startsAt: start };
}

const TITLES = ['Rest is ready', 'Your rest is waiting', 'Earned and ready', 'Time for something good'];

// A reward-first nudge, never a reminder to do something. The wording rotates by day so it stays fresh.
export function restNudge(pileMins: number, pick: RestPick | null, now: Date): { title: string; body: string } {
  const n = Math.floor(pileMins);
  const hh = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = Math.floor(now.getTime() / 86_400_000);
  const bodies = pick
    ? [
        `${n} min of rest are yours. ${pick.habit.name} at ${hh(pick.startsAt)}? One tap.`,
        `You did the work. ${pick.habit.name} is ready when you are.`,
        `${n} min saved up. How about ${pick.habit.name} tonight?`,
      ]
    : [`${n} min of rest are yours. Pick a time and enjoy them.`, `You did the work. ${n} min of rest are waiting.`];
  return { title: TITLES[day % TITLES.length], body: bodies[day % bodies.length] };
}
