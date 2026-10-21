import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind } from '../day';
import { bookSlot } from '../slots';
import { sameSnapshot, widgetSnapshot } from '../widget';
import { makeData } from './fixtures';

const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);

describe('widgetSnapshot', () => {
  it('is empty for a fresh start', () => {
    assert.deepEqual(widgetSnapshot(makeData()), { availMins: 0, next: null, focus: null });
  });

  it('shows the rest that can be booked, in whole minutes', () => {
    const d = logGrind(makeData(), 'g1', 90, day(12))!.data; // 90 min at 0.5 = 45
    assert.equal(widgetSnapshot(d).availMins, 45);
  });

  it('holds booked rest back from what can be booked, and names the next slot', () => {
    let d = logGrind(makeData(), 'g1', 120, day(12))!.data; // 60
    const r = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 30, startsAt: day(12, 20), now: day(12, 18) });
    assert.ok(r.ok);
    d = r.data;
    const s = widgetSnapshot(d);
    assert.equal(s.availMins, 30);
    assert.deepEqual(s.next, { title: '🎮 PS5', startsAt: day(12, 20).getTime() });
  });

  it('carries a running focus with its goal, and ignores one for an activity that is gone', () => {
    const d = makeData();
    const f = { habitId: 'g1', startedAt: day(12, 9).toISOString(), goalMins: 25 };
    assert.deepEqual(widgetSnapshot(d, f).focus, { name: '💻 Deep Work', startedAt: day(12, 9).getTime(), goalMins: 25 });
    assert.equal(widgetSnapshot(d, { habitId: 'nope', startedAt: day(12, 9).toISOString() }).focus, null);
    assert.equal(widgetSnapshot(d, { habitId: 'g1', startedAt: day(12, 9).toISOString() }).focus?.goalMins, 0);
  });

  it('knows when nothing changed', () => {
    const a = widgetSnapshot(makeData());
    assert.equal(sameSnapshot(a, widgetSnapshot(makeData())), true);
    assert.equal(sameSnapshot(a, { ...a, availMins: 5 }), false);
  });
});
