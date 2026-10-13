import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { closeDay, logGrind } from '../day';
import { bookSlot, finishSlot } from '../slots';
import { summarizeDay, todayHint } from '../summary';
import { defaultProfile, makeData } from './fixtures';

const TUE_NOON = new Date(2026, 9, 13, 12, 0);
const TUE_EVENING = new Date(2026, 9, 13, 19, 0);
const SAT_NOON = new Date(2026, 9, 17, 12, 0);

describe('summarizeDay', () => {
  it('is all zeros for a day with no log', () => {
    const s = summarizeDay(makeData(), TUE_NOON);
    assert.deepEqual(s, { earned: 0, spent: 0, workMins: 0, restMins: 0, score: 0, closed: false });
  });

  it('adds up work and rest separately; counters earn but are not timed work', () => {
    let d = logGrind(makeData(), 'g1', 90, TUE_NOON)!.data; // 45 earned
    d = logGrind(d, 'g3', 2, TUE_NOON)!.data; // 30 earned, no minutes
    const slot = bookSlot(d, { id: 's', habitId: 'gl1', plannedMins: 30, startsAt: TUE_NOON, now: TUE_NOON });
    assert.ok(slot.ok);
    d = finishSlot(slot.data, 's', 30, TUE_NOON)!.data;
    const s = summarizeDay(d, TUE_NOON);
    assert.equal(s.earned, 75);
    assert.equal(s.workMins, 90);
    assert.equal(s.restMins, 30);
    assert.equal(s.spent, 30);
  });

  it('rest costs half on a rest day', () => {
    let d = logGrind(makeData(), 'g1', 120, SAT_NOON)!.data;
    const slot = bookSlot(d, { id: 's', habitId: 'gl1', plannedMins: 40, startsAt: SAT_NOON, now: SAT_NOON });
    assert.ok(slot.ok);
    d = finishSlot(slot.data, 's', 40, SAT_NOON)!.data;
    assert.equal(summarizeDay(d, SAT_NOON).spent, 20);
  });

  it('reports the closing note', () => {
    const d = closeDay(makeData(), TUE_EVENING, 'Call the bank');
    const s = summarizeDay(d, TUE_EVENING);
    assert.equal(s.closed, true);
    assert.equal(s.tomorrowFirst, 'Call the bank');
  });
});

describe('todayHint', () => {
  it('suggests a first focus block on an empty working morning', () => {
    assert.equal(todayHint(makeData(), TUE_NOON).kind, 'start');
  });

  it('stays quiet on an empty rest day', () => {
    assert.equal(todayHint(makeData(), SAT_NOON).kind, 'idle');
  });

  it('suggests booking when enough rest is saved and nothing is booked', () => {
    const d = logGrind(makeData(), 'g1', 180, TUE_NOON)!.data; // 90 min saved
    assert.equal(todayHint(d, TUE_NOON).kind, 'book');
  });

  it('does not suggest booking when a slot is already open', () => {
    let d = logGrind(makeData(), 'g1', 240, TUE_NOON)!.data; // 120 saved
    const slot = bookSlot(d, { id: 's', habitId: 'gl1', plannedMins: 30, startsAt: TUE_EVENING, now: TUE_NOON });
    assert.ok(slot.ok);
    d = slot.data;
    assert.equal(todayHint(d, TUE_NOON).kind, 'idle');
  });

  it('reports borrowed rest', () => {
    const d = makeData({ earnedTimeBank: -20 });
    const h = todayHint(d, TUE_NOON);
    assert.equal(h.kind, 'debt');
    assert.match(h.text, /20 min/);
  });

  it('asks to close the day after work end, then confirms once closed', () => {
    const d = logGrind(makeData(), 'g1', 60, TUE_EVENING)!.data;
    assert.equal(todayHint(d, TUE_EVENING).kind, 'close');
    assert.equal(todayHint(closeDay(d, TUE_EVENING), TUE_EVENING).kind, 'closed');
  });

  it('uses the profile slot length as the booking threshold', () => {
    const d = makeData({ earnedTimeBank: 40, profile: { ...defaultProfile, defaultSlotMins: 30 } });
    assert.equal(todayHint(d, TUE_NOON).kind, 'book');
    const d2 = makeData({ earnedTimeBank: 40 });
    assert.notEqual(todayHint(d2, TUE_NOON).kind, 'book');
  });
});
