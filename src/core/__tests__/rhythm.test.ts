import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addWorkHours, bestWindow, removeWorkHours } from '../rhythm';
import { isUserData } from '../backup';
import { makeData } from './fixtures';

const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m);

describe('rhythm', () => {
  it('spreads a session over the hours it covered, counting back from its end', () => {
    const d = addWorkHours(makeData(), at(10, 30), 90); // 09:00 to 10:30
    assert.equal(d.workByHour![9], 60);
    assert.equal(d.workByHour![10], 30);
    assert.equal(d.workByHour!.reduce((a, b) => a + b, 0), 90);
  });

  it('crosses midnight', () => {
    const d = addWorkHours(makeData(), at(0, 20), 40); // 23:40 to 00:20
    assert.equal(d.workByHour![23], 20);
    assert.equal(d.workByHour![0], 20);
  });

  it('can take a session back out, and never goes below zero', () => {
    const d = addWorkHours(makeData(), at(10), 60);
    const back = removeWorkHours(d, at(10), 60);
    assert.equal(back.workByHour!.reduce((a, b) => a + b, 0), 0);
    assert.ok(removeWorkHours(back, at(10), 60).workByHour!.every((n) => n >= 0));
  });

  it('says nothing until there are five hours of timed work', () => {
    assert.equal(bestWindow(makeData()), null);
    assert.equal(bestWindow(addWorkHours(makeData(), at(11), 240)), null);
  });

  it('finds the three hours that hold most of the focus', () => {
    let d = makeData();
    d = addWorkHours(d, at(12), 180); // 09 to 12
    d = addWorkHours(d, at(12), 120);
    d = addWorkHours(d, at(21), 60);
    const w = bestWindow(d)!;
    assert.equal(w.from, 9);
    assert.equal(w.to, 12);
    assert.ok(Math.abs(w.share - 300 / 360) < 1e-9);
  });

  it('is part of a valid backup, and a broken list is not', () => {
    const d = addWorkHours(makeData(), at(10), 60);
    assert.equal(isUserData(JSON.parse(JSON.stringify(d))), true);
    assert.equal(isUserData({ ...d, workByHour: [1, 2, 3] }), false);
    assert.equal(isUserData({ ...d, workByHour: new Array(24).fill(-1) }), false);
  });
});
