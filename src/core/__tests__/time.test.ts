import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addMinutes, formatHM, inQuietWindow, minutesOfDay, parseHM } from '../time';

describe('time helpers', () => {
  it('parses and formats HH:MM', () => {
    assert.equal(parseHM('23:30'), 1410);
    assert.equal(formatHM(1410), '23:30');
    assert.equal(formatHM(0), '00:00');
  });

  it('formatHM wraps around midnight in both directions', () => {
    assert.equal(formatHM(1440 + 30), '00:30');
    assert.equal(formatHM(-15), '23:45');
  });

  it('minutesOfDay and addMinutes use local time', () => {
    const d = new Date(2026, 9, 13, 22, 45);
    assert.equal(minutesOfDay(d), 22 * 60 + 45);
    assert.equal(minutesOfDay(addMinutes(d, 30)), 23 * 60 + 15);
    assert.equal(minutesOfDay(addMinutes(d, 90)), 15, 'wraps past midnight');
  });
});

describe('quiet window (bedtime until 05:00)', () => {
  const bed23 = parseHM('23:00');
  it('evening bedtime: blocks from bedtime across midnight until 05:00', () => {
    assert.equal(inQuietWindow(parseHM('22:59'), bed23), false);
    assert.equal(inQuietWindow(parseHM('23:00'), bed23), true);
    assert.equal(inQuietWindow(parseHM('02:00'), bed23), true);
    assert.equal(inQuietWindow(parseHM('04:59'), bed23), true);
    assert.equal(inQuietWindow(parseHM('05:00'), bed23), false);
  });

  it('after-midnight bedtime: 00:30 blocks only from 00:30 to 05:00', () => {
    const bed0030 = parseHM('00:30');
    assert.equal(inQuietWindow(parseHM('23:50'), bed0030), false);
    assert.equal(inQuietWindow(parseHM('00:15'), bed0030), false);
    assert.equal(inQuietWindow(parseHM('00:30'), bed0030), true);
    assert.equal(inQuietWindow(parseHM('04:00'), bed0030), true);
  });
});
