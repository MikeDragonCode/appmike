import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind } from '../day';
import { logRest } from '../adjust';
import { monthSummary } from '../month';
import { makeData } from './fixtures';

const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);

describe('monthSummary', () => {
  it('waits for a week of days', () => {
    let d = makeData();
    for (let n = 1; n <= 5; n++) d = logGrind(d, 'g1', 120, day(n))!.data;
    d = logRest(d, 'gl1', 30, day(5, 20))!.data;
    assert.equal(monthSummary(d, day(6)), null);
  });

  it('adds up work and rest over the last 30 days', () => {
    let d = makeData();
    for (let n = 1; n <= 8; n++) d = logGrind(d, 'g1', 120, day(n))!.data;
    for (let n = 2; n <= 4; n++) d = logRest(d, 'gl1', 30, day(n, 20))!.data;
    const m = monthSummary(d, day(9))!;
    assert.equal(m.workMins, 8 * 120);
    assert.equal(m.restMins, 90);
    assert.equal(m.activeDays, 8);
  });

  it('says nothing when there was no rest to look back on', () => {
    let d = makeData();
    for (let n = 1; n <= 8; n++) d = logGrind(d, 'g1', 120, day(n))!.data;
    assert.equal(monthSummary(d, day(9)), null);
  });
});
