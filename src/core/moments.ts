import { UserData } from './types';

// Small things worth a smile. A moment is earned once and never taken back: nothing here
// resets, expires or counts a miss. They are worked out from what is already stored, so the only
// thing kept is which ones the person has already been shown (UserData.momentsSeen).
export interface Moment {
  id: string;
  emoji: string;
  title: string;
  line: string;
  earned: boolean;
}

function workMins(data: UserData): number {
  let total = 0;
  for (const log of data.logs) {
    for (const l of log.grindLogs) {
      const h = data.habits.find((x) => x.id === l.habitId);
      if (h?.valueType === 'duration') total += l.value;
    }
  }
  return total;
}

const restTaken = (data: UserData) => data.slots.filter((s) => s.state === 'done' || s.state === 'partial').length;
const nightsClosed = (data: UserData) => data.logs.filter((l) => l.closedAt).length;
const goodDays = (data: UserData) => data.logs.filter((l) => l.score > 20).length;
const morningMins = (data: UserData) => (data.workByHour ?? []).slice(5, 9).reduce((a, b) => a + b, 0);

export function allMoments(data: UserData): Moment[] {
  const w = workMins(data);
  const rest = restTaken(data);
  const nights = nightsClosed(data);
  const m = (id: string, emoji: string, title: string, line: string, earned: boolean): Moment => ({ id, emoji, title, line, earned });
  return [
    m('first_focus', '☀️', 'First spark', 'Your first focus block is in. The bank has something in it now.', w >= 1),
    m('hour_one', '⏱️', 'One whole hour', 'An hour of real focus. Worth a stretch.', w >= 60),
    m('first_rest', '🌴', 'Rest on purpose', 'You booked rest and took it. This is the whole idea.', rest >= 1),
    m('first_close', '🌙', 'Day closed', 'You closed a day. Sleep well.', nights >= 1),
    m('ten_hours', '🔥', 'Ten hours in', 'Ten hours of focus so far. Quietly impressive.', w >= 600),
    m('rest_five', '🍹', 'Five good breaks', 'Rest taken on purpose, five times. You are getting good at this.', rest >= 5),
    m('good_five', '🌟', 'Five good days', 'Five days that counted. They do not have to be in a row.', goodDays(data) >= 5),
    m('early_hour', '🐦', 'Early bird', 'An hour of focus before nine. Coffee earned.', morningMins(data) >= 60),
    m('seven_nights', '🛌', 'A week of closed days', 'Seven days closed. Your evenings thank you.', nights >= 7),
    m('fifty_hours', '🏔️', 'Fifty hours', 'Fifty hours of focus. That is a small mountain.', w >= 3000),
  ];
}

export function newMoments(data: UserData): Moment[] {
  const seen = new Set(data.momentsSeen ?? []);
  return allMoments(data).filter((x) => x.earned && !seen.has(x.id));
}

export function seeMoment(data: UserData, id: string): UserData {
  const seen = data.momentsSeen ?? [];
  return seen.includes(id) ? data : { ...data, momentsSeen: [...seen, id] };
}
