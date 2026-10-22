import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restNudge, tonightsPick } from '../pick';
import { bookSlot } from '../slots';
import { makeData, defaultProfile, ps5 } from './fixtures';
import { HabitItem, Slot } from '../types';

const tue = (h: number, m = 0) => new Date(2026, 9, 13, h, m); // Tuesday
const movies: HabitItem = { id: 'gl2', name: 'Netflix', emoji: '', type: 'glow', valueType: 'duration', costRate: 1 };
const done = (habitId: string, mins: number, day: number): Slot => ({
  id: `s${habitId}${day}${mins}`,
  habitId,
  plannedMins: mins,
  startsAt: new Date(2026, 9, day, 20, 0).toISOString(),
  state: 'done',
  reservedCost: 0,
});

describe('tonightsPick', () => {
  it('offers the rest taken most, for the length usually taken, after work', () => {
    const d = makeData({
      habits: [ps5, movies],
      earnedTimeBank: 120,
      slots: [done('gl2', 45, 8), done('gl2', 45, 9), done('gl2', 90, 10), done('gl1', 60, 11)],
    });
    const p = tonightsPick(d, tue(15, 10))!;
    assert.equal(p.habit.id, 'gl2');
    assert.equal(p.mins, 45);
    assert.equal(p.startsAt.getHours(), 18); // work ends at 18:00
  });

  it('shortens to what the bank holds, and says nothing when it holds too little', () => {
    const d = makeData({ habits: [ps5], earnedTimeBank: 30 });
    assert.equal(tonightsPick(d, tue(19, 0))!.mins, 30);
    assert.equal(tonightsPick({ ...d, earnedTimeBank: 2 }, tue(19, 0)), null);
  });

  it('stays quiet when something is already booked', () => {
    const d = makeData({ habits: [ps5], earnedTimeBank: 120 });
    const booked = bookSlot(d, { id: 'x', habitId: 'gl1', plannedMins: 30, startsAt: tue(20, 0), now: tue(19, 0) });
    assert.ok(booked.ok);
    assert.equal(tonightsPick(booked.data, tue(19, 0)), null);
  });

  it('does not offer a time past a hard bedtime', () => {
    const d = makeData({ habits: [ps5], earnedTimeBank: 120, profile: { ...defaultProfile, hardBedtime: true, bedtime: '21:00' } });
    assert.equal(tonightsPick(d, tue(20, 40)), null);
  });
});

describe('restNudge', () => {
  it('names the pick and its time, and rotates the wording by day', () => {
    const pick = { habit: ps5, mins: 60, startsAt: tue(20, 0) };
    const a = restNudge(90, pick, tue(18, 30));
    assert.match(a.body, /PS5/);
    const other = restNudge(90, pick, new Date(2026, 9, 14, 18, 30));
    assert.notEqual(a.body + a.title, other.body + other.title);
  });

  it('still works with no pick', () => {
    assert.match(restNudge(75, null, tue(18, 30)).body, /75 min/);
  });
});
