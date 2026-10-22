import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restInsight, rateSlot } from '../insights';
import { isUserData } from '../backup';
import { makeData, ps5, doom } from './fixtures';
import { Recharge, Slot } from '../types';

const now = new Date(2026, 9, 20, 12, 0);
const slot = (id: string, habitId: string, day: number, state: Slot['state'], recharge?: Recharge): Slot => ({
  id,
  habitId,
  plannedMins: 60,
  startsAt: new Date(2026, 9, day, 20, 0).toISOString(),
  state,
  reservedCost: 0,
  recharge,
});

describe('rateSlot', () => {
  it('records a note on a finished rest only', () => {
    const d = makeData({ slots: [slot('a', 'gl1', 10, 'done'), slot('b', 'gl1', 11, 'planned')] });
    assert.equal(rateSlot(d, 'a', 2)!.slots[0].recharge, 2);
    assert.equal(rateSlot(d, 'b', 2), null); // not taken yet
    assert.equal(rateSlot(d, 'nope', 2), null);
  });

  it('never touches the bank', () => {
    const d = makeData({ earnedTimeBank: 90, slots: [slot('a', 'gl1', 10, 'done')] });
    assert.equal(rateSlot(d, 'a', 0)!.earnedTimeBank, 90);
  });
});

describe('restInsight', () => {
  it('waits for enough notes', () => {
    const d = makeData({ slots: [1, 2, 3, 4].map((n) => slot(`s${n}`, 'gl1', 10 + n, 'done', 2)) });
    assert.equal(restInsight(d, now), null);
  });

  it('counts recharged rests and names a clear leader', () => {
    const d = makeData({
      habits: [ps5, doom],
      slots: [
        slot('1', 'gl1', 10, 'done', 2),
        slot('2', 'gl1', 11, 'done', 2),
        slot('3', 'gl1', 12, 'done', 1),
        slot('4', 'gl3', 13, 'done', 0),
        slot('5', 'gl3', 14, 'done', 0),
        slot('6', 'gl3', 15, 'partial', 2),
      ],
    });
    const i = restInsight(d, now)!;
    assert.equal(i.rated, 6);
    assert.equal(i.recharged, 3);
    assert.equal(i.best?.name, 'PS5');
  });

  it('names nobody when there is no clear lead, and ignores old notes', () => {
    const d = makeData({
      slots: [
        slot('1', 'gl1', 10, 'done', 2),
        slot('2', 'gl1', 11, 'done', 0),
        slot('3', 'gl1', 12, 'done', 1),
        slot('4', 'gl1', 13, 'done', 0),
        slot('5', 'gl1', 14, 'done', 1),
      ],
    });
    assert.equal(restInsight(d, now)!.best, undefined);
    assert.equal(restInsight(d, new Date(2026, 11, 20)), null); // two months later: all outside the window
  });
});

describe('backup', () => {
  it('accepts a recharge note and refuses a made-up one', () => {
    const ok = makeData({ slots: [slot('a', 'gl1', 10, 'done', 1)] });
    assert.ok(isUserData(JSON.parse(JSON.stringify(ok))));
    const bad = JSON.parse(JSON.stringify(ok));
    bad.slots[0].recharge = 7;
    assert.equal(isUserData(bad), false);
  });
});
