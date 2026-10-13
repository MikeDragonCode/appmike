import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activeHabits, addCustomHabit, archiveHabit, habitWorth, setHabitWorth } from '../habits';
import { logGrind } from '../day';
import { summarizeDay } from '../summary';
import { bookSlot, finishSlot } from '../slots';
import { UserData } from '../types';
import { makeData } from './fixtures';

const NOW = new Date(2026, 9, 13, 12, 0);

function must(r: ReturnType<typeof addCustomHabit>): UserData {
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

describe('addCustomHabit', () => {
  it('adds work at the base rate and rest at one-to-one', () => {
    let d = must(addCustomHabit(makeData(), { type: 'grind', name: ' Guitar ', emoji: '🎸' }));
    d = must(addCustomHabit(d, { type: 'glow', name: 'Walk' }));
    const g = d.habits.find((h) => h.name === 'Guitar')!;
    const w = d.habits.find((h) => h.name === 'Walk')!;
    assert.equal(g.id, 'cg_1');
    assert.equal(g.earnRate, 0.5); // 30 min per hour
    assert.equal(g.emoji, '🎸');
    assert.equal(w.id, 'cl_1');
    assert.equal(w.costRate, 1);
    assert.equal(w.emoji, '✨');
  });

  it('never reuses an id, even after archiving', () => {
    let d = must(addCustomHabit(makeData(), { type: 'grind', name: 'A' }));
    d = must(addCustomHabit(d, { type: 'grind', name: 'B' }));
    d = must(archiveHabit(d, 'cg_2'));
    d = must(addCustomHabit(d, { type: 'grind', name: 'C' }));
    assert.deepEqual(d.habits.filter((h) => h.id.startsWith('cg_')).map((h) => h.id), ['cg_1', 'cg_2', 'cg_3']);
  });

  it('rejects empty and duplicate names (case-insensitive, per kind)', () => {
    assert.deepEqual(addCustomHabit(makeData(), { type: 'grind', name: '  ' }), { ok: false, error: 'empty_name' });
    assert.deepEqual(addCustomHabit(makeData(), { type: 'grind', name: 'deep work' }), { ok: false, error: 'duplicate_name' });
    assert.ok(addCustomHabit(makeData(), { type: 'glow', name: 'Deep Work' }).ok);
  });

  it('allows the name of an archived activity again', () => {
    const d = must(archiveHabit(makeData(), 'g3'));
    assert.ok(addCustomHabit(d, { type: 'grind', name: 'Cook' }).ok);
  });

  it('trims long names', () => {
    const d = must(addCustomHabit(makeData(), { type: 'grind', name: 'x'.repeat(80) }));
    assert.equal(d.habits[d.habits.length - 1].name.length, 30);
  });
});

describe('archiveHabit', () => {
  it('hides the activity from the active list but keeps it for history', () => {
    const logged = logGrind(makeData(), 'g1', 60, NOW)!.data;
    const d = must(archiveHabit(logged, 'g1'));
    assert.equal(activeHabits(d, 'grind').some((h) => h.id === 'g1'), false);
    assert.equal(d.habits.some((h) => h.id === 'g1'), true);
    assert.equal(summarizeDay(d, NOW).earned, 30, 'past work still counts');
    assert.equal(d.earnedTimeBank, 30);
  });

  it('an open slot of an archived rest activity can still be finished', () => {
    const saved = logGrind(makeData(), 'g1', 240, NOW)!.data;
    const slot = bookSlot(saved, { id: 's', habitId: 'gl1', plannedMins: 30, startsAt: NOW, now: NOW });
    assert.ok(slot.ok);
    const d = must(archiveHabit(slot.data, 'gl1'));
    const done = finishSlot(d, 's', 30, NOW);
    assert.ok(done);
    assert.equal(done.outcome.state, 'done');
  });

  it('keeps the last activity of each kind', () => {
    let d = makeData({ habits: makeData().habits.filter((h) => h.id === 'g1' || h.id === 'gl1') });
    assert.deepEqual(archiveHabit(d, 'g1'), { ok: false, error: 'last_of_kind' });
    assert.deepEqual(archiveHabit(d, 'gl1'), { ok: false, error: 'last_of_kind' });
    d = must(addCustomHabit(d, { type: 'grind', name: 'Another' }));
    assert.ok(archiveHabit(d, 'g1').ok);
  });

  it('reports unknown or already archived ids', () => {
    assert.deepEqual(archiveHabit(makeData(), 'nope'), { ok: false, error: 'unknown' });
    const d = must(archiveHabit(makeData(), 'g3'));
    assert.deepEqual(archiveHabit(d, 'g3'), { ok: false, error: 'unknown' });
  });
});

describe('setHabitWorth / habitWorth', () => {
  it('round-trips in the units the user sees', () => {
    let d = must(setHabitWorth(makeData(), 'g1', 45)); // timed work: min per hour
    assert.equal(d.habits.find((h) => h.id === 'g1')!.earnRate, 0.75);
    assert.equal(habitWorth(d.habits.find((h) => h.id === 'g1')!), 45);
    d = must(setHabitWorth(d, 'g3', 20)); // counter: min per completion
    assert.equal(d.habits.find((h) => h.id === 'g3')!.earnRate, 20);
    d = must(setHabitWorth(d, 'gl1', 30)); // rest: bank min per hour
    assert.equal(d.habits.find((h) => h.id === 'gl1')!.costRate, 0.5);
    assert.equal(habitWorth(d.habits.find((h) => h.id === 'gl1')!), 30);
  });

  it('never goes negative and rejects unknown ids', () => {
    const d = must(setHabitWorth(makeData(), 'g1', -10));
    assert.equal(d.habits.find((h) => h.id === 'g1')!.earnRate, 0);
    assert.deepEqual(setHabitWorth(makeData(), 'zzz', 10), { ok: false, error: 'unknown' });
  });

  it('does not touch past days or the bank', () => {
    const logged = logGrind(makeData(), 'g1', 60, NOW)!.data;
    const d = must(setHabitWorth(logged, 'g1', 60));
    assert.equal(d.earnedTimeBank, logged.earnedTimeBank);
    assert.deepEqual(d.logs, logged.logs);
  });
});
