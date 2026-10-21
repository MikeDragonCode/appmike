import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind, closeDay } from '../day';
import { allMoments, newMoments, seeMoment } from '../moments';
import { isUserData } from '../backup';
import { bookSlot, finishSlot } from '../slots';
import { makeData } from './fixtures';

const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);
const earnedIds = (d: ReturnType<typeof makeData>) => allMoments(d).filter((m) => m.earned).map((m) => m.id);

describe('moments', () => {
  it('starts with nothing', () => {
    assert.deepEqual(earnedIds(makeData()), []);
    assert.deepEqual(newMoments(makeData()), []);
  });

  it('a first focus block is a first spark, an hour is a whole hour', () => {
    let d = logGrind(makeData(), 'g1', 20, day(12))!.data;
    assert.deepEqual(earnedIds(d), ['first_focus']);
    d = logGrind(d, 'g1', 40, day(12, 15))!.data;
    assert.deepEqual(earnedIds(d), ['first_focus', 'hour_one']);
  });

  it('counters do not count as focus time', () => {
    assert.deepEqual(earnedIds(logGrind(makeData(), 'g3', 5, day(12))!.data), []);
  });

  it('rest taken on purpose and a closed day are noticed', () => {
    let d = logGrind(makeData(), 'g1', 120, day(12))!.data;
    const slot = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 30, startsAt: day(12, 19), now: day(12, 19) });
    assert.ok(slot.ok);
    d = finishSlot(slot.data, 's1', 30, day(12, 20))!.data;
    d = closeDay(d, day(12, 22));
    const ids = earnedIds(d);
    assert.ok(ids.includes('first_rest'));
    assert.ok(ids.includes('first_close'));
  });

  it('a moment is shown once: seeing it takes it off the new list and nothing takes it back', () => {
    let d = logGrind(makeData(), 'g1', 90, day(12))!.data;
    assert.deepEqual(newMoments(d).map((m) => m.id), ['first_focus', 'hour_one']);
    d = seeMoment(d, 'first_focus');
    assert.deepEqual(newMoments(d).map((m) => m.id), ['hour_one']);
    assert.equal(seeMoment(d, 'first_focus'), d);
  });

  it('early focus is an early bird', () => {
    const d = { ...makeData(), workByHour: Object.assign(new Array(24).fill(0), { 7: 60 }) };
    assert.ok(earnedIds(d).includes('early_hour'));
  });

  it('seen moments survive a backup, a broken list does not', () => {
    const d = seeMoment(makeData(), 'first_focus');
    assert.equal(isUserData(JSON.parse(JSON.stringify(d))), true);
    assert.equal(isUserData({ ...d, momentsSeen: [1] }), false);
  });
});
