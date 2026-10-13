import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableMins, bookSlot, doneSlotsLast7, finishSlot, glowCost, nextOpenSlot, reservedMins, skipSlot, startSlot,
} from '../slots';
import { Slot, UserData } from '../types';
import { defaultProfile, doom, deepWork, makeData, ps5 } from './fixtures';

// Tuesday 2026-10-13, 18:00 local. Saturday 17 Oct is a rest day (restDays 0 and 6).
const NOW = new Date(2026, 9, 13, 18, 0);
const at = (h: number, m = 0, day = 13) => new Date(2026, 9, day, h, m);

const book = (data: UserData, over: Partial<Parameters<typeof bookSlot>[1]> = {}) =>
  bookSlot(data, { id: 's1', habitId: 'gl1', plannedMins: 60, startsAt: NOW, now: NOW, ...over });

function mustBook(data: UserData, over: Partial<Parameters<typeof bookSlot>[1]> = {}) {
  const r = book(data, over);
  if (!r.ok) throw new Error(`booking failed: ${r.error}`);
  return r;
}

describe('glowCost', () => {
  it('multiplies minutes by the cost rate and halves on rest days', () => {
    assert.equal(glowCost(ps5, 60, false), 60);
    assert.equal(glowCost(doom, 20, false), 30);
    assert.equal(glowCost(ps5, 60, true), 30);
  });
});

describe('bookSlot', () => {
  it('reserves the cost and lowers what is available', () => {
    const r = mustBook(makeData({ earnedTimeBank: 100 }));
    assert.equal(r.slot.state, 'planned');
    assert.equal(r.slot.reservedCost, 60);
    assert.equal(reservedMins(r.data), 60);
    assert.equal(availableMins(r.data), 40);
    assert.equal(r.data.earnedTimeBank, 100, 'the bank itself is untouched until the rest happens');
  });

  it('later bookings see earlier reservations', () => {
    const first = mustBook(makeData({ earnedTimeBank: 60 }));
    assert.equal(availableMins(first.data), 0);
    const second = bookSlot(first.data, { id: 's2', habitId: 'gl1', plannedMins: 30, startsAt: at(20), now: NOW });
    assert.equal(second.ok, true, 'a 30 min advance fits the default cap');
    if (!second.ok) return;
    assert.equal(availableMins(second.data), -30);
    const third = bookSlot(second.data, { id: 's3', habitId: 'gl1', plannedMins: 5, startsAt: at(21), now: NOW });
    assert.deepEqual(third, { ok: false, error: 'over_limit', shortBy: 5 });
  });

  it('refuses beyond the advance cap and says by how much', () => {
    const r = book(makeData({ earnedTimeBank: 0 }), { plannedMins: 45 });
    assert.deepEqual(r, { ok: false, error: 'over_limit', shortBy: 15 });
  });

  it('allows exactly the cap', () => {
    assert.equal(book(makeData({ earnedTimeBank: 0 }), { plannedMins: 30 }).ok, true);
  });

  it('the cap is bigger when the profile allows it (no energy: 60)', () => {
    const data = makeData({ profile: { ...defaultProfile, advanceCapMins: 60 } });
    assert.equal(book(data, { plannedMins: 60 }).ok, true);
    assert.equal(book(data, { plannedMins: 61 }).ok, false);
  });

  it('doomscrolling costs more bank than it lasts', () => {
    const r = mustBook(makeData({ earnedTimeBank: 100 }), { habitId: 'gl3', plannedMins: 20 });
    assert.equal(r.slot.reservedCost, 30);
  });

  it('rest days make rest cheaper, judged by the slot date', () => {
    const r = mustBook(makeData({ earnedTimeBank: 100 }), { startsAt: at(20, 0, 17) }); // Saturday
    assert.equal(r.slot.reservedCost, 30);
    const weekday = mustBook(makeData({ earnedTimeBank: 100 }), { startsAt: at(20, 0, 14) }); // Wednesday
    assert.equal(weekday.slot.reservedCost, 60);
  });

  it('rejects bad input', () => {
    const data = makeData({ earnedTimeBank: 100 });
    assert.deepEqual(book(data, { habitId: 'nope' }), { ok: false, error: 'unknown_activity' });
    assert.deepEqual(book(data, { habitId: 'g1' }), { ok: false, error: 'not_rest_activity' });
    assert.deepEqual(book(data, { plannedMins: 4 }), { ok: false, error: 'too_short' });
    assert.deepEqual(book(data, { startsAt: at(15) }), { ok: false, error: 'in_the_past' });
  });

  it('"now" is fine even half a minute late', () => {
    const data = makeData({ earnedTimeBank: 100 });
    assert.equal(book(data, { startsAt: new Date(NOW.getTime() - 30_000) }).ok, true);
  });
});

describe('bookSlot: bedtime guard', () => {
  const sleepy = (bedtime = '23:00') =>
    makeData({ earnedTimeBank: 200, profile: { ...defaultProfile, hardBedtime: true, bedtime } });

  it('allows a slot that ends exactly at bedtime', () => {
    assert.equal(book(sleepy(), { startsAt: at(22, 0) }).ok, true);
  });

  it('blocks a slot that runs one minute past bedtime', () => {
    assert.deepEqual(book(sleepy(), { startsAt: at(22, 1) }), { ok: false, error: 'past_bedtime' });
  });

  it('blocks a slot that starts in the quiet window', () => {
    const lateNow = new Date(2026, 9, 14, 1, 0);
    assert.deepEqual(book(sleepy(), { startsAt: lateNow, now: lateNow }), { ok: false, error: 'past_bedtime' });
  });

  it('works with an after-midnight bedtime', () => {
    assert.equal(book(sleepy('00:30'), { startsAt: at(23, 30) }).ok, true);
    assert.deepEqual(book(sleepy('00:30'), { startsAt: at(23, 45) }), { ok: false, error: 'past_bedtime' });
  });

  it('does nothing when the bedtime guard is off', () => {
    const data = makeData({ earnedTimeBank: 200, profile: { ...defaultProfile, hardBedtime: false } });
    assert.equal(book(data, { startsAt: at(23, 30) }).ok, true);
  });
});

describe('startSlot / nextOpenSlot', () => {
  it('start marks the slot active', () => {
    const r = mustBook(makeData({ earnedTimeBank: 100 }));
    const next = startSlot(r.data, 's1', NOW);
    assert.equal(next.slots[0].state, 'active');
    assert.equal(next.slots[0].startedAt, NOW.toISOString());
  });

  it('nextOpenSlot picks the earliest open one and ignores finished ones', () => {
    const base = makeData({ earnedTimeBank: 300 });
    const a = mustBook(base, { id: 'late', startsAt: at(21) });
    const b = mustBook(a.data, { id: 'early', startsAt: at(19) });
    assert.equal(nextOpenSlot(b.data)?.id, 'early');
    const done = finishSlot(b.data, 'early', 60, at(20));
    assert.equal(nextOpenSlot(done!.data)?.id, 'late');
    assert.equal(nextOpenSlot(makeData()), null);
  });
});

describe('finishSlot', () => {
  const booked = () => mustBook(makeData({ earnedTimeBank: 100 })).data;

  it('done: nearly the whole slot was used', () => {
    const r = finishSlot(booked(), 's1', 55, at(19, 5))!;
    assert.equal(r.outcome.state, 'done');
    assert.equal(r.outcome.charged, 55);
    assert.equal(r.outcome.returned, 5);
    assert.equal(r.outcome.message, 'Rest taken: 55 min. Well spent.');
    assert.equal(r.data.earnedTimeBank, 45);
    assert.equal(availableMins(r.data), 45, 'the reservation is released');
    assert.equal(r.data.slots[0].state, 'done');
    assert.equal(r.data.slots[0].actualMins, 55);
    assert.equal(r.data.slots[0].reservedCost, 0, 'a closed slot holds nothing');
  });

  it('partial: 5 of 60 minutes is not a taken rest, and the rest goes back softly', () => {
    const r = finishSlot(booked(), 's1', 5, at(19, 5))!;
    assert.equal(r.outcome.state, 'partial');
    assert.equal(r.outcome.charged, 5);
    assert.equal(r.outcome.returned, 55);
    assert.equal(r.outcome.message, 'Used 5 of 60 min. The rest went back to your bank.');
    assert.equal(r.data.earnedTimeBank, 95);
    assert.equal(doneSlotsLast7(r.data, at(20)), 0, 'a partial slot does not count toward the weekly goal');
  });

  it('skipped: nothing spent, no glow entry in the day log', () => {
    const r = skipSlot(booked(), 's1', at(19))!;
    assert.equal(r.outcome.state, 'skipped');
    assert.equal(r.outcome.message, 'Skipped. 60 min are back in your bank.');
    assert.equal(r.data.earnedTimeBank, 100);
    assert.equal(r.data.logs.length, 0);
    assert.equal(availableMins(r.data), 100);
  });

  it('the completion threshold is 80% of the plan, rounded up', () => {
    assert.equal(finishSlot(booked(), 's1', 47, at(20))!.outcome.state, 'partial');
    assert.equal(finishSlot(booked(), 's1', 48, at(20))!.outcome.state, 'done');
    const short = mustBook(makeData({ earnedTimeBank: 100 }), { plannedMins: 25 }).data;
    assert.equal(finishSlot(short, 's1', 19, at(20))!.outcome.state, 'partial');
    assert.equal(finishSlot(short, 's1', 20, at(20))!.outcome.state, 'done');
  });

  it('overrunning a slot is allowed and charged for', () => {
    const base = mustBook(makeData({ earnedTimeBank: 100 }), { plannedMins: 30 }).data;
    const r = finishSlot(base, 's1', 45, at(20))!;
    assert.equal(r.outcome.state, 'done');
    assert.equal(r.outcome.charged, 45);
    assert.equal(r.outcome.returned, 0);
    assert.equal(r.data.earnedTimeBank, 55);
  });

  it('on a rest day only half price is charged', () => {
    const sat = new Date(2026, 9, 17, 12, 0); // Saturday
    const base = mustBook(makeData({ earnedTimeBank: 100 }), { startsAt: sat, now: sat }).data;
    const r = finishSlot(base, 's1', 60, new Date(2026, 9, 17, 13, 0))!;
    assert.equal(r.outcome.charged, 30);
    assert.equal(r.data.earnedTimeBank, 70);
  });

  it('cannot be finished twice, and unknown slots give null', () => {
    const once = finishSlot(booked(), 's1', 60, at(20))!;
    assert.equal(finishSlot(once.data, 's1', 60, at(20)), null);
    assert.equal(finishSlot(booked(), 'nope', 60, at(20)), null);
  });

  it('does not mutate its input', () => {
    const data = booked();
    const snapshot = JSON.stringify(data);
    finishSlot(data, 's1', 60, at(20));
    assert.equal(JSON.stringify(data), snapshot);
  });

  it('adds the rest to the day log and rescoring reflects the balance', () => {
    const worked = makeData({
      earnedTimeBank: 60,
      logs: [{ date: '2026-10-13', grindLogs: [{ habitId: 'g1', value: 120 }], glowLogs: [], earnedTimeDelta: 60, score: 60 }],
    });
    const base = mustBook(worked).data;
    const r = finishSlot(base, 's1', 40, at(20))!;
    const log = r.data.logs.find((l) => l.date === '2026-10-13')!;
    assert.deepEqual(log.glowLogs, [{ habitId: 'gl1', value: 40 }]);
    assert.equal(log.score, 100, '60 earned, 40 spent: Perfect Balance');
    assert.equal(r.data.earnedTimeBank, 20);
  });
});

describe('doneSlotsLast7', () => {
  const slot = (id: string, state: Slot['state'], finishedAt?: Date): Slot => ({
    id, habitId: 'gl1', plannedMins: 60, startsAt: NOW.toISOString(), state, reservedCost: 0,
    finishedAt: finishedAt?.toISOString(),
  });

  it('counts only done slots finished within the last seven days', () => {
    const data = makeData({
      slots: [
        slot('a', 'done', new Date(2026, 9, 13, 10)),
        slot('b', 'done', new Date(2026, 9, 7, 23, 0)),
        slot('c', 'done', new Date(2026, 9, 6, 23, 0)),
        slot('d', 'partial', new Date(2026, 9, 13, 11)),
        slot('e', 'skipped', new Date(2026, 9, 13, 12)),
      ],
    });
    assert.equal(doneSlotsLast7(data, NOW), 2);
  });
});

describe('deepWork stays a grind activity', () => {
  it('cannot be booked as rest', () => {
    assert.equal(deepWork.type, 'grind');
  });
});
