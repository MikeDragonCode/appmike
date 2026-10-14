import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dateToStr } from '../bank';
import { Slot } from '../types';
import { currentWeek, defaultWeekStart, doneSlotsThisWeek, startOfWeek, weekdayOrder, weekStartOf } from '../week';
import { defaultProfile, makeData } from './fixtures';

// October 2026: Sun 11, Mon 12, Tue 13, Wed 14, Sat 17, Sun 18.
const d = (n: number, h = 12) => new Date(2026, 9, n, h, 0);
const withStart = (weekStart?: number) => makeData({ profile: { ...defaultProfile, weekStart } });

describe('weekStartOf', () => {
  it('is Monday for data saved before the setting existed', () => {
    assert.equal(weekStartOf(makeData()), 1);
  });
  it('uses what was chosen, and ignores nonsense', () => {
    assert.equal(weekStartOf(withStart(0)), 0);
    assert.equal(weekStartOf(withStart(1)), 1);
    assert.equal(weekStartOf(withStart(9)), 1);
    assert.equal(weekStartOf(withStart(1.5)), 1);
    assert.equal(weekStartOf(makeData({ profile: { ...defaultProfile, weekStart: 'sun' as unknown as number } })), 1);
  });
});

describe('defaultWeekStart', () => {
  it('is Sunday for the US and a few other regions, Monday elsewhere', () => {
    assert.equal(defaultWeekStart('US'), 0);
    assert.equal(defaultWeekStart('us'), 0);
    assert.equal(defaultWeekStart('CA'), 0);
    for (const r of ['PT', 'GB', 'DE', 'FR', 'ES', 'RU', 'UA', 'PL']) assert.equal(defaultWeekStart(r), 1, r);
  });
  it('is Monday when the region is unknown', () => {
    assert.equal(defaultWeekStart(undefined), 1);
    assert.equal(defaultWeekStart(''), 1);
  });
});

describe('weekdayOrder', () => {
  it('starts on the chosen day', () => {
    assert.deepEqual(weekdayOrder(1), [1, 2, 3, 4, 5, 6, 0]);
    assert.deepEqual(weekdayOrder(0), [0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('startOfWeek', () => {
  it('goes back to the first day of the week, at midnight', () => {
    const wed = startOfWeek(d(14, 15), 1);
    assert.equal(dateToStr(wed), '2026-10-12');
    assert.equal(wed.getHours(), 0);
    assert.equal(dateToStr(startOfWeek(d(14), 0)), '2026-10-11');
  });
  it('a first day is its own week start; the day before belongs to the week before', () => {
    assert.equal(dateToStr(startOfWeek(d(12), 1)), '2026-10-12');
    assert.equal(dateToStr(startOfWeek(d(11), 1)), '2026-10-05');
    assert.equal(dateToStr(startOfWeek(d(11), 0)), '2026-10-11');
  });
  it('crosses a month and a year', () => {
    assert.equal(dateToStr(startOfWeek(new Date(2026, 10, 1, 10), 1)), '2026-10-26');
    assert.equal(dateToStr(startOfWeek(new Date(2027, 0, 1, 10), 1)), '2026-12-28');
  });
});

describe('currentWeek', () => {
  const data = makeData({
    logs: [
      { date: '2026-10-12', grindLogs: [], glowLogs: [], earnedTimeDelta: 0, score: 40 },
      { date: '2026-10-13', grindLogs: [], glowLogs: [], earnedTimeDelta: 0, score: 90 },
      { date: '2026-10-11', grindLogs: [], glowLogs: [], earnedTimeDelta: 0, score: 70 }, // the Sunday before
    ],
  });

  it('is seven days from Monday, with today marked and the rest of the week as future', () => {
    const w = currentWeek(data, d(14)); // Wednesday
    assert.deepEqual(w.map((x) => x.date), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    assert.deepEqual(w.map((x) => x.isToday), [false, false, true, false, false, false, false]);
    assert.deepEqual(w.map((x) => x.isFuture), [false, false, false, true, true, true, true]);
    assert.deepEqual(w.map((x) => x.score), [40, 90, 0, 0, 0, 0, 0]);
  });

  it('on a Sunday-first week, Wednesday sits in the middle', () => {
    const w = currentWeek(withStart(0), d(14));
    assert.equal(w[0].date, '2026-10-11');
    assert.equal(w[3].isToday, true);
  });

  it('puts the Sunday at the end of a Monday week, and starts a new week on Monday', () => {
    const sunday = currentWeek(data, d(18));
    assert.equal(sunday[6].isToday, true);
    assert.equal(sunday.some((x) => x.isFuture), false);
    const monday = currentWeek(data, d(19));
    assert.equal(monday[0].isToday, true);
    assert.equal(monday[0].date, '2026-10-19');
    assert.equal(monday.filter((x) => x.isFuture).length, 6);
  });

  it('reads the scores of the days it shows', () => {
    const w = currentWeek(data, d(11)); // Sunday 11 closes the week 5-11
    assert.equal(w[6].score, 70);
  });
});

describe('doneSlotsThisWeek', () => {
  const slot = (id: string, state: Slot['state'], finishedAt?: Date): Slot => ({
    id, habitId: 'gl1', plannedMins: 60, startsAt: d(13).toISOString(), state, reservedCost: 0, finishedAt: finishedAt?.toISOString(),
  });
  const data = makeData({
    slots: [
      slot('a', 'done', d(13, 10)), // Tuesday this week
      slot('b', 'done', d(12, 0)), // Monday, first minute of the week
      slot('c', 'done', new Date(2026, 9, 11, 23, 59)), // Sunday night: last week
      slot('d', 'partial', d(13, 11)),
      slot('e', 'skipped', d(13, 12)),
    ],
  });

  it('counts only done slots finished since the week began', () => {
    assert.equal(doneSlotsThisWeek(data, d(14)), 2);
  });
  it('starts over on the first day of the week', () => {
    assert.equal(doneSlotsThisWeek(data, d(19)), 0);
  });
  it('follows the week start', () => {
    const sunday = { ...data, profile: { ...data.profile, weekStart: 0 } };
    assert.equal(doneSlotsThisWeek(sunday, d(14)), 3); // the Sunday-night slot is now this week
  });
});
