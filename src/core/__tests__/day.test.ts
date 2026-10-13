import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { closeDay, isDayClosed, logGrind } from '../day';
import { makeData } from './fixtures';

const NOW = new Date(2026, 9, 13, 11, 0); // Tuesday

describe('logGrind', () => {
  it('adds earned minutes to the bank through the day log', () => {
    const r = logGrind(makeData(), 'g1', 60, NOW)!;
    assert.equal(r.earned, 30);
    assert.equal(r.data.earnedTimeBank, 30);
    assert.deepEqual(r.data.logs[0].grindLogs, [{ habitId: 'g1', value: 60 }]);
  });

  it('accumulates within a day and updates the bank by the difference only', () => {
    const a = logGrind(makeData(), 'g1', 60, NOW)!;
    const b = logGrind(a.data, 'g1', 60, NOW)!;
    assert.equal(b.data.logs.length, 1);
    assert.deepEqual(b.data.logs[0].grindLogs, [{ habitId: 'g1', value: 120 }]);
    assert.equal(b.data.earnedTimeBank, 60);
  });

  it('counter activities earn per completion', () => {
    const r = logGrind(makeData(), 'g3', 2, NOW)!;
    assert.equal(r.earned, 30);
  });

  it('the day score follows the profile earn rate', () => {
    // Hardcore: 15 rest min/hour. Two hours of 0.25/min work reads as a real day (>= 24).
    const hardcore = makeData({
      habits: [{ id: 'g1', name: 'Deep Work', emoji: '💻', type: 'grind', valueType: 'duration', earnRate: 0.25 }],
    });
    hardcore.profile = { ...hardcore.profile, restPerHour: 15 };
    const r = logGrind(hardcore, 'g1', 120, NOW)!;
    assert.equal(r.data.logs[0].score, 60);
  });

  it('rejects unknown, non-grind and non-positive input', () => {
    assert.equal(logGrind(makeData(), 'nope', 10, NOW), null);
    assert.equal(logGrind(makeData(), 'gl1', 10, NOW), null);
    assert.equal(logGrind(makeData(), 'g1', 0, NOW), null);
    assert.equal(logGrind(makeData(), 'g1', -5, NOW), null);
  });
});

describe('closeDay (evening ritual)', () => {
  it('marks today closed and stores a trimmed first task for tomorrow', () => {
    const data = closeDay(makeData(), NOW, '  Reply to the audit email  ');
    assert.equal(isDayClosed(data, NOW), true);
    assert.equal(data.logs[0].tomorrowFirst, 'Reply to the audit email');
    assert.equal(data.logs[0].closedAt, NOW.toISOString());
  });

  it('works for a day with no activity and without a note', () => {
    const data = closeDay(makeData(), NOW, '   ');
    assert.equal(isDayClosed(data, NOW), true);
    assert.equal('tomorrowFirst' in data.logs[0], false);
  });

  it('keeps the day activity and does not move the bank', () => {
    const worked = logGrind(makeData(), 'g1', 60, NOW)!.data;
    const closed = closeDay(worked, NOW, 'x');
    assert.equal(closed.earnedTimeBank, 30);
    assert.deepEqual(closed.logs[0].grindLogs, [{ habitId: 'g1', value: 60 }]);
  });

  it('is not closed by default', () => {
    assert.equal(isDayClosed(makeData(), NOW), false);
  });
});
