import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extendSlot, logRest, undoLog } from '../adjust';
import { logGrind } from '../day';
import { availableMins, bookSlot, finishSlot, reservedMins, startSlot } from '../slots';
import { defaultProfile, makeData } from './fixtures';

const NOW = new Date(2026, 9, 13, 18, 0); // Tuesday

describe('logRest', () => {
  it('spends from the bank and records the minutes', () => {
    const base = logGrind(makeData(), 'g1', 120, NOW)!.data; // 60 saved
    const r = logRest(base, 'gl1', 20, NOW)!;
    assert.equal(r.charged, 20);
    assert.equal(r.data.earnedTimeBank, 40);
    assert.deepEqual(r.data.logs[0].glowLogs, [{ habitId: 'gl1', value: 20 }]);
  });

  it('may take the bank below zero, because it already happened', () => {
    const r = logRest(makeData(), 'gl3', 40, NOW)!; // doomscrolling costs 1.5
    assert.equal(r.data.earnedTimeBank, -60);
  });

  it('accumulates and halves on a rest day', () => {
    const sat = new Date(2026, 9, 17, 12, 0);
    let d = logRest(makeData(), 'gl1', 20, sat)!.data;
    d = logRest(d, 'gl1', 20, sat)!.data;
    assert.equal(d.logs[0].glowLogs[0].value, 40);
    assert.equal(d.earnedTimeBank, -20);
  });

  it('rejects work activities, unknown ids and non-positive minutes', () => {
    assert.equal(logRest(makeData(), 'g1', 10, NOW), null);
    assert.equal(logRest(makeData(), 'nope', 10, NOW), null);
    assert.equal(logRest(makeData(), 'gl1', 0, NOW), null);
  });
});

describe('undoLog', () => {
  it('takes back work and returns the bank to where it was', () => {
    const base = makeData();
    const after = logGrind(base, 'g1', 60, NOW)!.data;
    const undone = undoLog(after, 'work', 'g1', 60, NOW)!;
    assert.equal(undone.earnedTimeBank, 0);
    assert.deepEqual(undone.logs[0].grindLogs, []);
  });

  it('takes back part of an entry', () => {
    const after = logGrind(makeData(), 'g1', 60, NOW)!.data;
    const undone = undoLog(after, 'work', 'g1', 20, NOW)!;
    assert.deepEqual(undone.logs[0].grindLogs, [{ habitId: 'g1', value: 40 }]);
    assert.equal(undone.earnedTimeBank, 20);
  });

  it('takes back rest and restores the bank', () => {
    const after = logRest(logGrind(makeData(), 'g1', 120, NOW)!.data, 'gl1', 20, NOW)!.data;
    const undone = undoLog(after, 'rest', 'gl1', 20, NOW)!;
    assert.equal(undone.earnedTimeBank, 60);
  });

  it('works for counter activities', () => {
    const after = logGrind(makeData(), 'g3', 2, NOW)!.data; // 30 earned
    const undone = undoLog(after, 'work', 'g3', 1, NOW)!;
    assert.equal(undone.earnedTimeBank, 15);
  });

  it('refuses to take back more than was logged, or from another day', () => {
    const after = logGrind(makeData(), 'g1', 60, NOW)!.data;
    assert.equal(undoLog(after, 'work', 'g1', 61, NOW), null);
    assert.equal(undoLog(after, 'work', 'g1', 10, new Date(2026, 9, 14, 9, 0)), null);
    assert.equal(undoLog(after, 'work', 'g2', 10, NOW), null);
  });
});

function running(over = {}) {
  let d = logGrind(makeData(over), 'g1', 240, NOW)!.data; // 120 saved
  const r = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 60, startsAt: NOW, now: NOW });
  assert.ok(r.ok);
  d = startSlot(r.data, 's1', NOW);
  return d;
}

describe('extendSlot', () => {
  it('adds minutes and reserves the extra cost', () => {
    const r = extendSlot(running(), 's1', 15);
    assert.ok(r.ok);
    assert.equal(r.data.slots[0].plannedMins, 75);
    assert.equal(r.data.slots[0].reservedCost, 75);
    assert.equal(availableMins(r.data), 45);
  });

  it('finishes at the extended length like any slot', () => {
    const r = extendSlot(running(), 's1', 15);
    assert.ok(r.ok);
    const f = finishSlot(r.data, 's1', 75, new Date(2026, 9, 13, 19, 15))!;
    assert.equal(f.outcome.state, 'done');
    assert.equal(f.data.earnedTimeBank, 45);
    assert.equal(reservedMins(f.data), 0);
  });

  it('may borrow up to the advance limit, not beyond', () => {
    const d = running(); // 60 left
    assert.ok(extendSlot(d, 's1', 90).ok); // needs 90, room 60 + 30
    const r = extendSlot(d, 's1', 95);
    assert.deepEqual(r, { ok: false, error: 'over_limit', shortBy: 5 });
  });

  it('respects the bedtime rule', () => {
    const d = running({ profile: { ...defaultProfile, hardBedtime: true, bedtime: '19:30' } });
    assert.ok(extendSlot(d, 's1', 30).ok); // ends 19:30 exactly
    assert.deepEqual(extendSlot(d, 's1', 35), { ok: false, error: 'past_bedtime' });
  });

  it('only works on a running slot, with a sensible amount', () => {
    const d = logGrind(makeData(), 'g1', 240, NOW)!.data;
    const b = bookSlot(d, { id: 's2', habitId: 'gl1', plannedMins: 30, startsAt: NOW, now: NOW });
    assert.ok(b.ok);
    assert.deepEqual(extendSlot(b.data, 's2', 15), { ok: false, error: 'not_active' }); // only planned
    assert.deepEqual(extendSlot(running(), 's1', 3), { ok: false, error: 'too_short' });
    assert.deepEqual(extendSlot(running(), 'zzz', 15), { ok: false, error: 'not_active' });
  });

  it('does not mutate its input', () => {
    const d = running();
    const copy = JSON.stringify(d);
    extendSlot(d, 's1', 15);
    assert.equal(JSON.stringify(d), copy);
  });
});
