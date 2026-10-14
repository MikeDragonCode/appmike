import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind } from '../day';
import { dismissRecap, weeklyRecap } from '../recap';
import { bookSlot, finishSlot } from '../slots';
import { defaultProfile, makeData } from './fixtures';

// October 2026: Mon 5, Mon 12, Mon 19, Mon 26. Weeks start on Monday unless a test says otherwise.
const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);

// Installed Monday 5, used on Tue 6 and Thu 8, one rest slot taken on Thu 8.
function withWeek() {
  let d = makeData({ createdAt: day(5).toISOString() });
  d = logGrind(d, 'g1', 120, day(6))!.data;
  d = logGrind(d, 'g1', 60, day(8))!.data;
  const slot = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 30, startsAt: day(8, 19), now: day(8, 19) });
  assert.ok(slot.ok);
  d = finishSlot(slot.data, 's1', 30, day(8, 20))!.data;
  return d;
}

describe('weeklyRecap', () => {
  it('is not offered during the first week of use', () => {
    assert.equal(weeklyRecap(withWeek(), day(11)), null); // Sunday, still the same week
    assert.equal(weeklyRecap(withWeek(), day(8)), null);
  });

  it('comes on the first day of the next week and adds up the week that just ended', () => {
    const r = weeklyRecap(withWeek(), day(12))!;
    assert.equal(r.from, '2026-10-05');
    assert.equal(r.to, '2026-10-11');
    assert.equal(r.workMins, 180);
    assert.equal(r.earned, 90);
    assert.equal(r.restMins, 30);
    assert.equal(r.restSlots, 1);
  });

  it('stays available for the rest of the new week', () => {
    assert.equal(weeklyRecap(withWeek(), day(16))!.workMins, 180);
  });

  it('does not count today or other weeks', () => {
    let d = withWeek();
    d = logGrind(d, 'g1', 600, day(12))!.data; // today, in the new week
    d = logGrind(d, 'g1', 600, day(4))!.data; // Sunday before the week
    assert.equal(weeklyRecap(d, day(12))!.workMins, 180);
  });

  it('does not count rest taken in the new week', () => {
    const base = withWeek();
    const slot = bookSlot(base, { id: 's2', habitId: 'gl1', plannedMins: 30, startsAt: day(12, 9), now: day(12, 9) });
    assert.ok(slot.ok);
    const d = finishSlot(slot.data, 's2', 30, day(12, 10))!.data;
    assert.equal(weeklyRecap(d, day(12))!.restSlots, 1);
  });

  it('counts good days', () => {
    const r = weeklyRecap(withWeek(), day(12))!;
    assert.ok(r.goodDays >= 1 && r.goodDays <= 2);
  });

  it('stays quiet for an empty week', () => {
    assert.equal(weeklyRecap(makeData({ createdAt: day(1).toISOString() }), day(12)), null);
  });

  it('needs a few days of use in that week', () => {
    // Installed on Sunday 11: one day of the week 5-11 is not worth a look back.
    let d = makeData({ createdAt: day(11).toISOString() });
    d = logGrind(d, 'g1', 60, day(11))!.data;
    assert.equal(weeklyRecap(d, day(12)), null);
    // Installed on Friday 9: Fri, Sat and Sun are three days.
    let e = makeData({ createdAt: day(9).toISOString() });
    e = logGrind(e, 'g1', 60, day(9))!.data;
    assert.equal(weeklyRecap(e, day(12))!.workMins, 60);
  });

  it('is shown once, then again with the next week', () => {
    const d = dismissRecap(withWeek(), day(12));
    assert.equal(d.lastRecapDate, '2026-10-12');
    assert.equal(weeklyRecap(d, day(13)), null);
    assert.equal(weeklyRecap(d, day(18)), null); // Sunday, same week as the dismissal
    const later = logGrind(d, 'g1', 60, day(15))!.data;
    assert.equal(weeklyRecap(later, day(19))!.workMins, 60);
  });

  it('shows the last full week after a long break', () => {
    const d = logGrind(withWeek(), 'g1', 90, day(21))!.data; // week of 19-25
    const r = weeklyRecap(d, day(27))!;
    assert.equal(r.from, '2026-10-19');
    assert.equal(r.workMins, 90);
  });

  it('carries the weekly goal', () => {
    const d = withWeek();
    const r = weeklyRecap({ ...d, profile: { ...defaultProfile, weeklySlotGoal: 3 } }, day(12))!;
    assert.equal(r.slotGoal, 3);
  });

  it('follows the week start: a Sunday week turns over on Sunday', () => {
    const d = { ...withWeek(), profile: { ...defaultProfile, weekStart: 0 } };
    assert.equal(weeklyRecap(d, day(10)), null); // Saturday, the week 4-10 is not over
    const r = weeklyRecap(d, day(11))!; // Sunday 11 starts a new week; the one that ended is 4-10
    assert.equal(r.from, '2026-10-04');
    assert.equal(r.to, '2026-10-10');
    assert.equal(r.workMins, 180);
  });

  it('keeps whole weeks across the clock change at the end of October', () => {
    // Clocks change on Sunday 25 Oct in Europe. The week 19-25 must still be seven days.
    const d = logGrind(logGrind(withWeek(), 'g1', 30, day(19))!.data, 'g1', 30, day(25, 23))!.data;
    const r = weeklyRecap(d, day(26))!;
    assert.equal(r.from, '2026-10-19');
    assert.equal(r.to, '2026-10-25');
    assert.equal(r.workMins, 60);
  });
});
