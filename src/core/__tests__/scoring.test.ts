import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDailyMetrics, REST_DAY_GLOW_DISCOUNT } from '../scoring';
import { HabitItem } from '../types';

// Characterization tests: they pin down what the web version does TODAY.
// If a test fails after a deliberate change, update it on purpose.

const deepWork: HabitItem = { id: 'g1', name: 'Deep Work', emoji: '💻', type: 'grind', valueType: 'duration', earnRate: 0.5 };
const cook: HabitItem = { id: 'g3', name: 'Cook', emoji: '🍳', type: 'grind', valueType: 'counter', earnRate: 15 };
const zeroRate: HabitItem = { id: 'g0', name: 'No rate', emoji: '❔', type: 'grind', valueType: 'duration', earnRate: 0 };
const ps5: HabitItem = { id: 'gl1', name: 'PS5', emoji: '🎮', type: 'glow', valueType: 'duration', costRate: 1.0 };
const doom: HabitItem = { id: 'gl3', name: 'Doomscrolling', emoji: '📱', type: 'glow', valueType: 'duration', costRate: 1.5 };
const habits = [deepWork, cook, zeroRate, ps5, doom];

const grind = (habitId: string, value: number) => ({ habitId, value });
const run = (g: { habitId: string; value: number }[], gl: { habitId: string; value: number }[], rest = false, hours = 8, hs = habits) =>
  calculateDailyMetrics(g, gl, hs, rest, hours);

describe('calculateDailyMetrics: empty and partial days', () => {
  it('empty day scores 0 and does not move the bank', () => {
    const r = run([], []);
    assert.equal(r.scoreInfo.score, 0);
    assert.equal(r.scoreInfo.label, 'Log your day');
    assert.equal(r.earnedTimeDelta, 0);
  });

  it('glow without grind on a normal day: "Time to grind", bank goes negative', () => {
    const r = run([], [grind('gl1', 30)]);
    assert.equal(r.scoreInfo.score, 25);
    assert.equal(r.scoreInfo.label, 'Time to grind');
    assert.equal(r.earnedTimeDelta, -30);
  });

  it('glow without grind on a rest day is celebrated, at half price', () => {
    const r = run([], [grind('gl1', 30)], true);
    assert.equal(r.scoreInfo.score, 80);
    assert.equal(r.scoreInfo.label, 'Rest day — enjoy');
    assert.equal(r.earnedTimeDelta, -30 * REST_DAY_GLOW_DISCOUNT);
  });

  it('a little grind is "Warming up" (below the meaningful threshold)', () => {
    const r = run([grind('g1', 40)], []); // earns 20, threshold 48
    assert.equal(r.scoreInfo.score, 40);
    assert.equal(r.scoreInfo.label, 'Warming up');
    assert.equal(r.earnedTimeDelta, 20);
  });

  it('real grind and no rest yet: "You earned a break"', () => {
    const r = run([grind('g1', 120)], []); // earns 60
    assert.equal(r.scoreInfo.score, 60);
    assert.equal(r.scoreInfo.label, 'You earned a break');
    assert.equal(r.earnedTimeDelta, 60);
  });
});

describe('calculateDailyMetrics: balance ratio (spent / earned)', () => {
  const work = [grind('g1', 120)]; // earns 60

  it('ratio ~0.67 is Perfect Balance', () => {
    const r = run(work, [grind('gl1', 40)]);
    assert.equal(r.scoreInfo.score, 100);
    assert.equal(r.scoreInfo.label, 'Perfect Balance ✦');
    assert.equal(r.earnedTimeDelta, 20);
  });

  it('ratio below 0.5 is "Saved time"', () => {
    const r = run(work, [grind('gl1', 20)]);
    assert.equal(r.scoreInfo.score, 75);
    assert.equal(r.scoreInfo.label, 'Saved time');
  });

  it('ratio above 1.2 is "Borrowed time"', () => {
    const r = run(work, [grind('gl1', 80)]);
    assert.equal(r.scoreInfo.score, 50);
    assert.equal(r.scoreInfo.label, 'Borrowed time');
    assert.equal(r.earnedTimeDelta, -20);
  });

  it('boundaries: 0.5 and 1.2 are inclusive, just above 1.2 is not', () => {
    assert.equal(run(work, [grind('gl1', 30)]).scoreInfo.score, 100); // 0.5
    assert.equal(run(work, [grind('gl1', 72)]).scoreInfo.score, 100); // 1.2
    assert.equal(run(work, [grind('gl1', 73)]).scoreInfo.score, 50);
  });

  it('rest day halves glow cost, which changes the ratio and the bank', () => {
    const rest = run(work, [grind('gl1', 60)], true); // spent 30, ratio 0.5
    assert.equal(rest.earnedTimeDelta, 30);
    assert.equal(rest.scoreInfo.score, 100);
    const normal = run(work, [grind('gl1', 60)], false); // spent 60, ratio 1
    assert.equal(normal.earnedTimeDelta, 0);
    assert.equal(normal.scoreInfo.score, 100);
  });

  it('doomscrolling costs 1.5x per minute', () => {
    const r = run(work, [grind('gl3', 20)]);
    assert.equal(r.earnedTimeDelta, 60 - 30);
  });
});

describe('calculateDailyMetrics: input handling', () => {
  it('counter habits earn per completion', () => {
    const r = run([grind('g3', 2)], []);
    assert.equal(r.earnedTimeDelta, 30);
    assert.equal(r.scoreInfo.label, 'Warming up');
  });

  it('logs for unknown habits are ignored', () => {
    const r = run([grind('missing', 100)], [grind('missing2', 100)]);
    assert.equal(r.earnedTimeDelta, 0);
    assert.equal(r.scoreInfo.score, 0);
  });

  it('a habit with a zero rate earns nothing', () => {
    const r = run([grind('g0', 600)], []);
    assert.equal(r.earnedTimeDelta, 0);
    assert.equal(r.scoreInfo.score, 0);
  });
});

describe('calculateDailyMetrics: day pace (dailyGrindHours)', () => {
  it('threshold scales with pace: light 3h counts 20 earned minutes as a real day', () => {
    assert.equal(run([grind('g1', 40)], [], false, 3).scoreInfo.label, 'You earned a break');
    assert.equal(run([grind('g1', 40)], [], false, 8).scoreInfo.label, 'Warming up');
  });

  it('heavy 12h needs more: 60 earned minutes is still "Warming up"', () => {
    assert.equal(run([grind('g1', 120)], [], false, 12).scoreInfo.label, 'Warming up');
    assert.equal(run([grind('g1', 120)], [], false, 8).scoreInfo.label, 'You earned a break');
  });
});

describe('calculateDailyMetrics: reward multiplier', () => {
  // Onboarding sets "rest minutes per work hour" (Casual 45, Balanced 30, Hardcore 15).
  // The "meaningful day" threshold scales with it, so the same work reads the same.
  const balanced: HabitItem = { ...deepWork, earnRate: 30 / 60 };
  const hardcore: HabitItem = { ...deepWork, earnRate: 15 / 60 };
  const casual: HabitItem = { ...deepWork, earnRate: 45 / 60 };
  const twoHours = [grind('g1', 120)];

  it('the threshold scales with the earn rate: identical work, identical verdict', () => {
    assert.equal(calculateDailyMetrics(twoHours, [], [balanced], false, 8, 30).scoreInfo.label, 'You earned a break');
    assert.equal(calculateDailyMetrics(twoHours, [], [hardcore], false, 8, 15).scoreInfo.label, 'You earned a break');
    assert.equal(calculateDailyMetrics(twoHours, [], [casual], false, 8, 45).scoreInfo.label, 'You earned a break');
  });

  it('a little work is still "Warming up" at every rate', () => {
    const half = [grind('g1', 60)]; // one hour of an 8h day
    assert.equal(calculateDailyMetrics(half, [], [balanced], false, 8, 30).scoreInfo.label, 'Warming up');
    assert.equal(calculateDailyMetrics(half, [], [hardcore], false, 8, 15).scoreInfo.label, 'Warming up');
  });

  it('legacy: without the rate argument the Balanced threshold applies to everyone', () => {
    assert.equal(calculateDailyMetrics(twoHours, [], [hardcore], false, 8).scoreInfo.label, 'Warming up');
  });
});
