import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expireSlots } from '../maintenance';
import { availableMins, bookSlot, reservedMins, startSlot } from '../slots';
import { logGrind } from '../day';
import { makeData } from './fixtures';

const T0 = new Date(2026, 9, 13, 18, 0);
const plus = (mins: number) => new Date(T0.getTime() + mins * 60_000);

function withSlot(startedAfter?: number) {
  let d = logGrind(makeData(), 'g1', 240, T0)!.data; // 120 min saved
  const r = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 60, startsAt: T0, now: T0 });
  assert.ok(r.ok);
  d = r.data;
  if (startedAfter !== undefined) d = startSlot(d, 's1', plus(startedAfter));
  return d;
}

describe('expireSlots', () => {
  it('returns the very same object when nothing is stale', () => {
    const d = withSlot();
    const r = expireSlots(d, plus(60 + 29));
    assert.equal(r.data, d);
    assert.equal(r.expired.length, 0);
  });

  it('skips a slot that was never started and gives the reservation back', () => {
    const d = withSlot();
    assert.equal(reservedMins(d), 60);
    const r = expireSlots(d, plus(60 + 30));
    assert.equal(r.data.slots[0].state, 'skipped');
    assert.equal(reservedMins(r.data), 0);
    assert.equal(availableMins(r.data), 120);
    assert.equal(r.expired.length, 1);
  });

  it('counts a started but never finished slot as taken in full', () => {
    const d = withSlot(0);
    assert.equal(expireSlots(d, plus(60 + 59)).data, d);
    const r = expireSlots(d, plus(60 + 60));
    assert.equal(r.data.slots[0].state, 'done');
    assert.equal(r.data.slots[0].actualMins, 60);
    assert.equal(availableMins(r.data), 60); // 120 saved - 60 spent
  });

  it('ignores slots that are already closed and is idempotent', () => {
    const d = withSlot();
    const once = expireSlots(d, plus(500)).data;
    const twice = expireSlots(once, plus(900));
    assert.equal(twice.data, once);
  });

  it('does not mutate its input', () => {
    const d = withSlot();
    const copy = JSON.stringify(d);
    expireSlots(d, plus(500));
    assert.equal(JSON.stringify(d), copy);
  });
});
