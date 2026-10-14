import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUserData, parseBackup, serializeBackup } from '../backup';
import { logGrind } from '../day';
import { bookSlot } from '../slots';
import { makeData } from './fixtures';

const NOW = new Date(2026, 9, 13, 12, 0);

function richData() {
  const d = logGrind(makeData(), 'g1', 240, NOW)!.data;
  const s = bookSlot(d, { id: 's1', habitId: 'gl1', plannedMins: 30, startsAt: NOW, now: NOW });
  assert.ok(s.ok);
  return { ...s.data, checkinsDone: [3] };
}

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const d = richData();
    const r = parseBackup(serializeBackup(d, NOW));
    assert.ok(r.ok);
    assert.deepEqual(r.data, d);
  });

  it('tolerates surrounding whitespace from copy and paste', () => {
    const r = parseBackup(`\n  ${serializeBackup(makeData(), NOW)}  \n`);
    assert.ok(r.ok);
  });
});

describe('parseBackup rejects', () => {
  it('text that is not JSON', () => {
    assert.deepEqual(parseBackup('hello'), { ok: false, error: 'not_json' });
    assert.deepEqual(parseBackup(''), { ok: false, error: 'not_json' });
  });

  it('JSON from something else', () => {
    assert.deepEqual(parseBackup('{"a":1}'), { ok: false, error: 'wrong_file' });
    assert.deepEqual(parseBackup('[]'), { ok: false, error: 'wrong_file' });
    assert.deepEqual(parseBackup('null'), { ok: false, error: 'wrong_file' });
  });

  it('a backup from a newer app version', () => {
    const t = JSON.stringify({ app: 'shift-to-life', version: 99, data: makeData() });
    assert.deepEqual(parseBackup(t), { ok: false, error: 'newer_version' });
  });

  it('damaged data instead of crashing later', () => {
    const wrap = (data: unknown) => JSON.stringify({ app: 'shift-to-life', version: 1, data });
    assert.deepEqual(parseBackup(wrap({})), { ok: false, error: 'damaged' });
    assert.deepEqual(parseBackup(wrap(null)), { ok: false, error: 'damaged' });
    const d = makeData();
    assert.equal(parseBackup(wrap({ ...d, habits: [{ id: 1 }] })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, earnedTimeBank: 'lots' })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, restDays: [9] })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, logs: [{ date: 'yesterday' }] })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, slots: [{ id: 's', habitId: 'g', plannedMins: 5, startsAt: 'x', state: 'planned', reservedCost: 1 }] })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, onboardingComplete: false })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, profile: { ...d.profile, weekStart: 9 } })).ok, false);
    assert.equal(parseBackup(wrap({ ...d, profile: { ...d.profile, weekStart: 'monday' } })).ok, false);
  });
});

describe('isUserData', () => {
  it('accepts data saved before the week start existed, and either weekday for it', () => {
    assert.equal(isUserData(makeData()), true); // no weekStart in the fixture
    assert.equal(isUserData(makeData({ profile: { ...makeData().profile, weekStart: 0 } })), true);
    assert.equal(isUserData(makeData({ profile: { ...makeData().profile, weekStart: 1 } })), true);
  });

  it('accepts normal app data and rejects NaN numbers', () => {
    assert.equal(isUserData(richData()), true);
    assert.equal(isUserData({ ...makeData(), earnedTimeBank: NaN }), false);
  });
});
