import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logGrind } from '../day';
import { listDays, setLogEntry } from '../history';
import { logRest } from '../adjust';
import { changeRestPerHour } from '../plan';
import { makeData } from './fixtures';

const TUE = new Date(2026, 9, 13, 12, 0);
const MON = new Date(2026, 9, 12, 12, 0);

function twoDays() {
  let d = logGrind(makeData(), 'g1', 120, MON)!.data; // +60
  d = logRest(d, 'gl1', 20, MON)!.data; // -20
  d = logGrind(d, 'g1', 60, TUE)!.data; // +30
  return d;
}

describe('listDays', () => {
  it('lists days that have entries, newest first, with their entries', () => {
    const days = listDays(twoDays());
    assert.deepEqual(days.map((d) => d.date), ['2026-10-13', '2026-10-12']);
    assert.equal(days[1].workMins, 120);
    assert.equal(days[1].restMins, 20);
    assert.deepEqual(days[1].entries.map((e) => [e.habit.id, e.kind, e.value]), [['g1', 'work', 120], ['gl1', 'rest', 20]]);
  });

  it('is empty for a new account and respects the limit', () => {
    assert.deepEqual(listDays(makeData()), []);
    assert.equal(listDays(twoDays(), 1).length, 1);
  });
});

describe('setLogEntry', () => {
  it('changes a past entry and moves the bank by the difference only', () => {
    const d = twoDays(); // bank 70
    const r = setLogEntry(d, TUE, '2026-10-12', 'g1', 60);
    assert.ok(r.ok);
    assert.equal(r.data.earnedTimeBank, 70 - 30);
    assert.equal(r.data.logs.find((l) => l.date === '2026-10-12')!.grindLogs[0].value, 60);
    assert.equal(r.data.logs.find((l) => l.date === '2026-10-13')!.earnedTimeDelta, 30);
  });

  it('removes an entry when set to 0', () => {
    const r = setLogEntry(twoDays(), TUE, '2026-10-12', 'gl1', 0);
    assert.ok(r.ok);
    assert.equal(r.data.earnedTimeBank, 70 + 20);
    assert.deepEqual(r.data.logs.find((l) => l.date === '2026-10-12')!.glowLogs, []);
  });

  it('adds an entry to a day that had none', () => {
    const r = setLogEntry(makeData(), TUE, '2026-10-11', 'g1', 90);
    assert.ok(r.ok);
    assert.equal(r.data.earnedTimeBank, 45);
    assert.equal(listDays(r.data)[0].date, '2026-10-11');
  });

  it('rest costs half on a rest day', () => {
    const r = setLogEntry(makeData(), TUE, '2026-10-10', 'gl1', 40);
    assert.ok(r.ok);
    assert.equal(r.data.earnedTimeBank, -20);
  });

  it('leaves other days alone after the ratio was changed', () => {
    let d = twoDays();
    d = changeRestPerHour(d, 60); // work now earns double
    const r = setLogEntry(d, TUE, '2026-10-13', 'g1', 120); // +60 min of work at the new rate = +60
    assert.ok(r.ok);
    assert.equal(r.data.logs.find((l) => l.date === '2026-10-12')!.earnedTimeDelta, 40); // untouched
    assert.equal(r.data.earnedTimeBank, 70 + 60 * 1);
  });

  it('keeps the closing note', () => {
    let d = twoDays();
    d = { ...d, logs: d.logs.map((l) => (l.date === '2026-10-12' ? { ...l, closedAt: 'x', tomorrowFirst: 'Call' } : l)) };
    const r = setLogEntry(d, TUE, '2026-10-12', 'g1', 30);
    assert.ok(r.ok);
    assert.equal(r.data.logs.find((l) => l.date === '2026-10-12')!.tomorrowFirst, 'Call');
  });

  it('rounds counters and rejects bad input', () => {
    const r = setLogEntry(makeData(), TUE, '2026-10-12', 'g3', 2.6);
    assert.ok(r.ok);
    assert.equal(r.data.logs[0].grindLogs[0].value, 3);
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-12', 'nope', 5), { ok: false, error: 'unknown_activity' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-12', 'g1', -1), { ok: false, error: 'bad_value' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-12', 'g1', 1441), { ok: false, error: 'bad_value' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-12', 'g3', 100), { ok: false, error: 'bad_value' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-12', 'g1', NaN), { ok: false, error: 'bad_value' });
  });

  it('rejects the future, very old days and malformed dates', () => {
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-10-14', 'g1', 5), { ok: false, error: 'bad_date' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-08-01', 'g1', 5), { ok: false, error: 'bad_date' });
    assert.deepEqual(setLogEntry(makeData(), TUE, '2026-02-30', 'g1', 5), { ok: false, error: 'bad_date' });
    assert.deepEqual(setLogEntry(makeData(), TUE, 'yesterday', 'g1', 5), { ok: false, error: 'bad_date' });
  });

  it('does not mutate its input', () => {
    const d = twoDays();
    const copy = JSON.stringify(d);
    setLogEntry(d, TUE, '2026-10-12', 'g1', 10);
    assert.equal(JSON.stringify(d), copy);
  });
});
