import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { materializeHabits, DEFAULT_GLOW_IDS, DEFAULT_GRIND_IDS } from '../catalog';
import { Answers, buildProfile, changeRestPerHour, completeCheckin, createInitialData, describePlan, dueCheckin, selectionIsValid, shiftTime } from '../plan';
import { Struggle } from '../types';

const answers = (struggles: Struggle[] = [], over: Partial<Answers> = {}): Answers => ({
  struggles, paceHours: 8, workEnd: '18:00', bedtime: '23:00', restPerHour: 30, restDays: [0, 6], ...over,
});

const selection = {
  grindIds: DEFAULT_GRIND_IDS, glowIds: DEFAULT_GLOW_IDS, customGrind: [], customGlow: [],
};

describe('buildProfile: what each answer switches on', () => {
  it('no struggle: balanced defaults', () => {
    const p = buildProfile(answers());
    assert.equal(p.hardBedtime, false);
    assert.equal(p.advanceCapMins, 30);
    assert.equal(p.defaultSlotMins, 60);
    assert.equal(p.weeklySlotGoal, 0);
    assert.equal(p.remindClose, false);
    assert.equal(p.remindWindDown, false);
    assert.equal(p.remindBank, true);
  });

  it('week start: Monday unless asked otherwise', () => {
    assert.equal(buildProfile(answers()).weekStart, 1);
    assert.equal(buildProfile(answers([], { weekStart: 0 })).weekStart, 0);
  });

  it('sleep: bedtime becomes a hard limit with a wind-down reminder', () => {
    const p = buildProfile(answers(['sleep']));
    assert.equal(p.hardBedtime, true);
    assert.equal(p.remindWindDown, true);
  });

  it('overwork: a daily nudge to close the day', () => {
    assert.equal(buildProfile(answers(['overwork'])).remindClose, true);
  });

  it('no energy: shorter slots and a bigger advance', () => {
    const p = buildProfile(answers(['no_energy']));
    assert.equal(p.defaultSlotMins, 30);
    assert.equal(p.advanceCapMins, 60);
  });

  it('no time for hobbies: a weekly goal of three slots', () => {
    assert.equal(buildProfile(answers(['no_time_hobbies'])).weeklySlotGoal, 3);
  });

  it('combinations add up (sleep + overwork)', () => {
    const p = buildProfile(answers(['sleep', 'overwork']));
    assert.equal(p.hardBedtime && p.remindClose && p.remindWindDown, true);
  });

  it('carries times and the earn ratio through', () => {
    const p = buildProfile(answers([], { workEnd: '17:30', bedtime: '00:30', restPerHour: 20 }));
    assert.deepEqual([p.workEnd, p.bedtime, p.restPerHour], ['17:30', '00:30', 20]);
  });
});

describe('describePlan', () => {
  it('always ends with the earn rate', () => {
    const lines = describePlan(buildProfile(answers([], { restPerHour: 25 })));
    assert.equal(lines.at(-1), 'Every hour of focused work earns you 25 min of rest.');
  });

  it('says what the answers did, with the user own numbers', () => {
    const lines = describePlan(buildProfile(answers(['sleep', 'no_energy'], { bedtime: '22:30' }))).join('\n');
    assert.match(lines, /can't run past 22:30/);
    assert.match(lines, /borrow up to 60 min/);
    assert.match(lines, /30 min/);
  });

  it('has a sensible line when nothing was picked', () => {
    assert.match(describePlan(buildProfile(answers())).join('\n'), /balanced start/i);
  });
});

describe('materializeHabits', () => {
  it('derives earn rates from rest-per-hour (Balanced 30)', () => {
    const habits = materializeHabits({ ...selection, grindIds: ['g1', 'g2', 'g3'] }, 30);
    const by = (id: string) => habits.find((h) => h.id === id)!;
    assert.equal(by('g1').earnRate, 0.5);
    assert.equal(by('g2').earnRate, 0.75);
    assert.equal(by('g3').earnRate, 15);
  });

  it('Hardcore (15) halves them, Casual (45) raises them', () => {
    assert.equal(materializeHabits(selection, 15).find((h) => h.id === 'g1')!.earnRate, 0.25);
    assert.equal(materializeHabits(selection, 45).find((h) => h.id === 'g1')!.earnRate, 0.75);
    assert.equal(
      materializeHabits({ ...selection, grindIds: ['g3'] }, 15).find((h) => h.id === 'g3')!.earnRate,
      7.5,
    );
  });

  it('keeps glow cost rates and adds custom activities with unique ids', () => {
    const habits = materializeHabits(
      { ...selection, glowIds: ['gl1', 'gl3'], customGrind: [{ name: ' Piano ', emoji: '🎹' }], customGlow: [{ name: 'Surf', emoji: '' }, { name: 'Fishing', emoji: '🎣' }] },
      30,
    );
    assert.equal(habits.find((h) => h.id === 'gl3')!.costRate, 1.5);
    const piano = habits.find((h) => h.name === 'Piano')!;
    assert.equal(piano.type, 'grind');
    assert.equal(piano.earnRate, 0.5);
    const surf = habits.find((h) => h.name === 'Surf')!;
    assert.equal(surf.emoji, '✨');
    assert.equal(new Set(habits.map((h) => h.id)).size, habits.length);
  });
});

describe('createInitialData and selection rules', () => {
  it('builds a ready user with an empty bank', () => {
    const now = new Date(2026, 9, 13, 20, 0);
    const d = createInitialData({ answers: answers(['sleep']), selection }, now);
    assert.equal(d.earnedTimeBank, 0);
    assert.equal(d.onboardingComplete, true);
    assert.equal(d.dailyGrindHours, 8);
    assert.deepEqual(d.restDays, [0, 6]);
    assert.deepEqual(d.slots, []);
    assert.equal(d.profile.hardBedtime, true);
    assert.equal(d.createdAt, now.toISOString());
  });

  it('needs at least two activities of each kind', () => {
    assert.equal(selectionIsValid(selection), true);
    assert.equal(selectionIsValid({ ...selection, grindIds: ['g1'] }), false);
    assert.equal(selectionIsValid({ ...selection, grindIds: ['g1'], customGrind: [{ name: 'x', emoji: '' }] }), true);
    assert.equal(selectionIsValid({ ...selection, glowIds: [] }), false);
  });

  it('shiftTime moves a time of day and wraps midnight', () => {
    assert.equal(shiftTime('23:30', 60), '00:30');
    assert.equal(shiftTime('00:15', -30), '23:45');
  });
});

describe('changeRestPerHour', () => {
  const base = createInitialData(
    {
      answers: { struggles: [], paceHours: 8, workEnd: '18:00', bedtime: '23:00', restPerHour: 30, restDays: [0, 6] },
      selection: { grindIds: ['g1', 'g2', 'g3'], glowIds: ['gl1', 'gl2'], customGrind: [], customGlow: [] },
    },
    new Date(2026, 9, 13, 9, 0),
  );

  it('scales every grind rate and keeps glow costs', () => {
    const next = changeRestPerHour(base, 15);
    assert.equal(next.profile.restPerHour, 15);
    for (const h of next.habits) {
      const before = base.habits.find((x) => x.id === h.id)!;
      if (h.type === 'grind') assert.ok(Math.abs(h.earnRate! - before.earnRate! / 2) < 1e-9, h.id);
      else assert.equal(h.costRate, before.costRate);
    }
  });

  it('clamps to the allowed range and ignores no-ops', () => {
    assert.equal(changeRestPerHour(base, 500).profile.restPerHour, 60);
    assert.equal(changeRestPerHour(base, 1).profile.restPerHour, 5);
    assert.equal(changeRestPerHour(base, 30), base);
  });

  it('does not mutate its input', () => {
    const copy = JSON.stringify(base);
    changeRestPerHour(base, 45);
    assert.equal(JSON.stringify(base), copy);
  });
});

describe('check-ins', () => {
  const created = new Date(2026, 9, 1, 9, 0);
  const base = createInitialData(
    {
      answers: { struggles: ['overwork'], paceHours: 8, workEnd: '18:00', bedtime: '23:00', restPerHour: 30, restDays: [0, 6] },
      selection: { grindIds: ['g1', 'g2'], glowIds: ['gl1', 'gl2'], customGrind: [], customGlow: [] },
    },
    created,
  );
  const day = (n: number) => new Date(2026, 9, 1 + n, 20, 0);

  it('is not due before day 3', () => {
    assert.equal(dueCheckin(base, day(0)), null);
    assert.equal(dueCheckin(base, day(2)), null);
  });

  it('becomes due on day 3, 7 and 14', () => {
    assert.equal(dueCheckin(base, day(3)), 3);
    assert.equal(dueCheckin(base, day(7)), 7);
    assert.equal(dueCheckin(base, day(14)), 14);
    assert.equal(dueCheckin(base, day(40)), 14);
  });

  it('folds missed stages into the latest one', () => {
    const answered = completeCheckin(base, 14);
    assert.deepEqual(answered.checkinsDone, [3, 7, 14]);
    assert.equal(dueCheckin(answered, day(20)), null);
  });

  it('stays quiet once the stage is handled, then asks again at the next', () => {
    const d3 = completeCheckin(base, 3);
    assert.equal(dueCheckin(d3, day(5)), null);
    assert.equal(dueCheckin(d3, day(7)), 7);
  });

  it('keeps the plan when no struggles are passed', () => {
    const r = completeCheckin(base, 3);
    assert.deepEqual(r.profile, base.profile);
  });

  it('applyStruggles changes only the rules tied to struggles', () => {
    const tweaked = { ...base, profile: { ...base.profile, workEnd: '17:30', restPerHour: 20, remindBank: false } };
    const r = completeCheckin(tweaked, 7, ['sleep', 'no_energy']).profile;
    assert.deepEqual(r.struggles, ['sleep', 'no_energy']);
    assert.equal(r.hardBedtime, true);
    assert.equal(r.remindWindDown, true);
    assert.equal(r.remindClose, false);
    assert.equal(r.advanceCapMins, 60);
    assert.equal(r.defaultSlotMins, 30);
    assert.equal(r.workEnd, '17:30');
    assert.equal(r.restPerHour, 20);
    assert.equal(r.remindBank, false);
  });

  it('works when no stage was ever recorded (older data)', () => {
    const legacy = { ...base };
    delete legacy.checkinsDone;
    assert.equal(dueCheckin(legacy, day(4)), 3);
  });
});
