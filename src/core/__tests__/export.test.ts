import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_HEADER, csvText, toCsv } from '../export';
import { logRest } from '../adjust';
import { logGrind } from '../day';
import { makeData } from './fixtures';

const MON = new Date(2026, 9, 12, 12, 0);
const SAT = new Date(2026, 9, 10, 12, 0);

describe('csvText', () => {
  it('leaves plain text alone and quotes commas, quotes and newlines', () => {
    assert.equal(csvText('Deep Work'), 'Deep Work');
    assert.equal(csvText('Cook, clean'), '"Cook, clean"');
    assert.equal(csvText('Say "hi"'), '"Say ""hi"""');
    assert.equal(csvText('a\nb'), '"a\nb"');
  });

  it('defuses spreadsheet formulas', () => {
    assert.equal(csvText('=SUM(A1)'), "'=SUM(A1)");
    assert.equal(csvText('+1'), "'+1");
    assert.equal(csvText('-2'), "'-2");
    assert.equal(csvText('@cmd'), "'@cmd");
    assert.equal(csvText('=a,b'), `"'=a,b"`);
  });
});

describe('toCsv', () => {
  it('is only a header for an empty account', () => {
    assert.equal(toCsv(makeData()), `${CSV_HEADER}\n`);
  });

  it('writes one signed row per activity per day, oldest first', () => {
    let d = logGrind(makeData(), 'g1', 120, MON)!.data;
    d = logRest(d, 'gl1', 20, MON)!.data;
    d = logGrind(d, 'g3', 2, SAT)!.data;
    assert.equal(
      toCsv(d),
      [
        CSV_HEADER,
        '2026-10-10,work,Cook,2,count,30,yes',
        '2026-10-12,work,Deep Work,120,min,60,no',
        '2026-10-12,rest,PS5,20,min,-20,no',
        '',
      ].join('\n'),
    );
  });

  it('halves the cost of rest on a rest day', () => {
    const d = logRest(makeData(), 'gl1', 40, SAT)!.data;
    assert.match(toCsv(d), /2026-10-10,rest,PS5,40,min,-20,yes/);
  });

  it('skips activities that no longer exist and keeps odd names safe', () => {
    let d = logGrind(makeData(), 'g1', 30, MON)!.data;
    d = { ...d, habits: d.habits.map((h) => (h.id === 'g1' ? { ...h, name: '=HYPERLINK("x")' } : h)) };
    assert.match(toCsv(d), /"'=HYPERLINK\(""x""\)"/);
    const gone = { ...d, habits: d.habits.filter((h) => h.id !== 'g1') };
    assert.equal(toCsv(gone), `${CSV_HEADER}\n`);
  });
});
