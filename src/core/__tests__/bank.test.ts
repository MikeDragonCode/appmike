import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyDayLog, dateToStr, getBestStreak, getLast7Days, getSoftStreak, getStreak, isRestDay } from '../bank';
import { DayLog } from '../types';
import { makeData } from './fixtures';

// "Today" is fixed: Tuesday 2026-10-13. Weekdays: Mon 12, Sun 11, Sat 10, Fri 9.
const TODAY = new Date(2026, 9, 13, 12, 0, 0);

const log = (date: string, score: number, earnedTimeDelta = 0): DayLog => ({
  date, grindLogs: [], glowLogs: [], earnedTimeDelta, score,
});

describe('dates', () => {
  it('dateToStr zero-pads month and day', () => {
    assert.equal(dateToStr(new Date(2026, 0, 5)), '2026-01-05');
  });

  it('isRestDay follows data.restDays (0 = Sunday)', () => {
    const data = makeData({ restDays: [0, 6] });
    assert.equal(isRestDay(data, new Date(2026, 9, 11)), true);  // Sun
    assert.equal(isRestDay(data, new Date(2026, 9, 13)), false); // Tue
    assert.equal(isRestDay(makeData({ restDays: [] }), new Date(2026, 9, 11)), false);
  });
});

describe('applyDayLog (time bank)', () => {
  it('adds a new day and its delta to the bank', () => {
    const next = applyDayLog(makeData({ earnedTimeBank: 10 }), log('2026-10-13', 60, 25));
    assert.equal(next.earnedTimeBank, 35);
    assert.equal(next.logs.length, 1);
  });

  it('re-saving the same date applies only the difference', () => {
    const once = applyDayLog(makeData(), log('2026-10-13', 60, 30));
    const twice = applyDayLog(once, log('2026-10-13', 100, 45));
    assert.equal(twice.logs.length, 1);
    assert.equal(twice.earnedTimeBank, 45);
  });

  it('does not mutate its input', () => {
    const data = makeData({ earnedTimeBank: 5 });
    applyDayLog(data, log('2026-10-13', 60, 25));
    assert.equal(data.logs.length, 0);
    assert.equal(data.earnedTimeBank, 5);
  });

  it('the bank has no floor: it can go into debt without limit (current behavior)', () => {
    const next = applyDayLog(makeData(), log('2026-10-13', 25, -500));
    assert.equal(next.earnedTimeBank, -500);
  });
});

describe('getStreak', () => {
  it('counts consecutive active days; rest days neither count nor break', () => {
    const data = makeData({ logs: [log('2026-10-13', 60), log('2026-10-12', 60), log('2026-10-09', 60)] });
    assert.equal(getStreak(data, TODAY), 3); // Tue, Mon, (Sun/Sat rest), Fri
  });

  it('a missed weekday breaks the streak', () => {
    const data = makeData({ logs: [log('2026-10-13', 60), log('2026-10-09', 60)] }); // Mon 12 missing
    assert.equal(getStreak(data, TODAY), 1);
  });

  it('today without a log does not break the streak yet', () => {
    const data = makeData({ logs: [log('2026-10-12', 60), log('2026-10-09', 60)] });
    assert.equal(getStreak(data, TODAY), 2);
  });

  it('a day needs score > 20: exactly 20 does not count, 21 does', () => {
    assert.equal(getStreak(makeData({ logs: [log('2026-10-13', 20)] }), TODAY), 0);
    assert.equal(getStreak(makeData({ logs: [log('2026-10-13', 21)] }), TODAY), 1);
  });

  it('an active rest day counts toward the streak', () => {
    const data = makeData({ logs: [log('2026-10-13', 60), log('2026-10-12', 60), log('2026-10-11', 80)] });
    assert.equal(getStreak(data, TODAY), 3); // Sun counted, Sat rest, Fri missing breaks
  });

  it('with no rest days one missed day resets the streak to zero (no forgiveness)', () => {
    const data = makeData({ restDays: [], logs: [log('2026-10-13', 60), log('2026-10-11', 60), log('2026-10-10', 60)] });
    assert.equal(getStreak(data, TODAY), 1);
  });
});

describe('getBestStreak', () => {
  it('is 0 without logs', () => {
    assert.equal(getBestStreak(makeData(), TODAY), 0);
  });

  it('finds the longest run since createdAt', () => {
    const data = makeData({
      restDays: [],
      logs: [
        log('2026-10-01', 60), log('2026-10-02', 60), log('2026-10-03', 60),
        log('2026-10-05', 60), log('2026-10-06', 60),
      ],
    });
    assert.equal(getBestStreak(data, TODAY), 3);
  });
});

describe('getLast7Days', () => {
  it('returns 7 entries, oldest first, zero for days without a log', () => {
    const data = makeData({ logs: [log('2026-10-13', 90), log('2026-10-10', 40)] });
    const days = getLast7Days(data, TODAY);
    assert.equal(days.length, 7);
    assert.equal(days[0].date, '2026-10-07');
    assert.equal(days[6].date, '2026-10-13');
    assert.equal(days[6].score, 90);
    assert.equal(days[3].score, 40);
    assert.equal(days[1].score, 0);
  });
});

describe('getSoftStreak (forgiving)', () => {
  it('forgives a single missed workday that the strict streak would break on', () => {
    const data = makeData({ logs: [log('2026-10-13', 60), log('2026-10-09', 60)] }); // Mon 12 missed
    assert.equal(getStreak(data, TODAY), 1);
    assert.equal(getSoftStreak(data, TODAY), 2);
  });

  it('ends after two missed workdays in a row (rest days in between are neutral)', () => {
    // Mon 12 and Fri 9 are both missed workdays; Sat/Sun are rest days
    const data = makeData({ logs: [log('2026-10-13', 60), log('2026-10-08', 60)] });
    assert.equal(getSoftStreak(data, TODAY), 1);
  });

  it('a log in between resets the miss counter', () => {
    const data = makeData({
      logs: [log('2026-10-13', 60), log('2026-10-09', 60), log('2026-10-07', 60)], // Mon, Thu missed
    });
    assert.equal(getSoftStreak(data, TODAY), 3);
  });

  it('today without a log is still open and does not count as a miss', () => {
    const data = makeData({ logs: [log('2026-10-12', 60)] });
    assert.equal(getSoftStreak(data, TODAY), 1);
  });

  it('is 0 without logs', () => {
    assert.equal(getSoftStreak(makeData(), TODAY), 0);
  });
});
