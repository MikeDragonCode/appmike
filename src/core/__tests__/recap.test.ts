import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind } from '../day';
import { dismissRecap, weeklyRecap } from '../recap';
import { bookSlot, finishSlot } from '../slots';
import { defaultProfile, makeData } from './fixtures';

// makeData() was created on 1 Oct 2026. Tuesday 13 Oct is day 12.
const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);

function withWeek() {
  let d = makeData({ createdAt: day(5).toISOString() });
  d = logGrind(d, 'g1', 120, day(6))!.data; // Tue 6
  d = logGrind(d, 'g1', 60, day(8))!.data; // Thu 8
  const slot = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 30, startsAt: day(8, 19), now: day(8, 19) });
  assert.ok(slot.ok);
  d = finishSlot(slot.data, 's1', 30, day(8, 20))!.data;
  return d;
}

describe('weeklyRecap', () => {
  it('is not offered before the app has been used for a week', () => {
    assert.equal(weeklyRecap(withWeek(), day(11)), null);
  });

  it('adds up the 7 days before today', () => {
    const r = weeklyRecap(withWeek(), day(12))!;
    assert.equal(r.from, '2026-10-05');
    assert.equal(r.to, '2026-10-11');
    assert.equal(r.workMins, 180);
    assert.equal(r.earned, 90);
    assert.equal(r.restMins, 30);
    assert.equal(r.restSlots, 1);
  });

  it('does not count today or older days', () => {
    let d = withWeek();
    d = logGrind(d, 'g1', 600, day(12))!.data; // today, not in the window
    d = logGrind(d, 'g1', 600, day(4))!.data; // before the window
    assert.equal(weeklyRecap(d, day(12))!.workMins, 180);
  });

  it('counts good days', () => {
    const r = weeklyRecap(withWeek(), day(12))!;
    assert.ok(r.goodDays >= 1 && r.goodDays <= 2);
  });

  it('stays quiet for an empty week', () => {
    assert.equal(weeklyRecap(makeData({ createdAt: day(1).toISOString() }), day(12)), null);
  });

  it('is shown once, then again a week later', () => {
    const d = dismissRecap(withWeek(), day(12));
    assert.equal(d.lastRecapDate, '2026-10-12');
    assert.equal(weeklyRecap(d, day(13)), null);
    assert.equal(weeklyRecap(d, day(18)), null);
    const later = logGrind(d, 'g1', 60, day(15))!.data;
    assert.equal(weeklyRecap(later, day(19))!.workMins, 60);
  });

  it('carries the weekly goal', () => {
    const d = withWeek();
    const r = weeklyRecap({ ...d, profile: { ...defaultProfile, weeklySlotGoal: 3 } }, day(12))!;
    assert.equal(r.slotGoal, 3);
  });
});
