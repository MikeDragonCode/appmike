import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logRest } from '../adjust';
import { logGrind } from '../day';
import { restPace } from '../pace';
import { makeData } from './fixtures';

// Monday 12 to Sunday 18 October 2026, weeks start on Monday.
const day = (n: number, h = 12) => new Date(2026, 9, n, h, 0);

function worked(hours: number[]) {
  let d = makeData({ createdAt: day(12).toISOString() });
  hours.forEach((h, i) => (d = logGrind(d, 'g1', h * 60, day(12 + i))!.data));
  return d;
}

describe('restPace', () => {
  it('says nothing early in the week or with little to go on', () => {
    assert.equal(restPace(worked([4]), day(12)), null); // one day only
    assert.equal(restPace(worked([1, 1]), day(13)), null); // 60 min earned, under the floor
  });

  it('notices rest left on the table', () => {
    const p = restPace(worked([4, 4]), day(13))!; // 240 earned (deepWork pays 0.5 per minute), none taken
    assert.equal(p.kind, 'unused');
    assert.equal(p.earned, 240);
    assert.equal(p.spent, 0);
  });

  it('is calm when work and rest are in step', () => {
    let d = worked([4, 4]);
    d = logRest(d, 'gl1', 150, day(13, 20))!.data; // 150 spent of 240
    assert.equal(restPace(d, day(13, 21))!.kind, 'balanced');
  });

  it('says nothing about days that are still to come', () => {
    const d = worked([4, 4, 4]); // Mon, Tue, Wed
    assert.equal(restPace(d, day(13))!.earned, 240); // looking from Tuesday, Wednesday does not count
  });

  it('says nothing when rest was borrowed far ahead', () => {
    let d = worked([4, 4]);
    d = logRest(d, 'gl1', 400, day(13, 20))!.data;
    assert.equal(restPace(d, day(13, 21)), null);
  });
});
