import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import bundled from '../data/lotto-history.json';
import { seededRandom } from '../../../shared/random';
import { LOTTO_SCORE_WEIGHTS } from '../config';
import { recommendGames, diversifyGames } from '../algorithms/recommend';
import {
  calculateCombinationScore,
  empiricalDistributionScore,
} from '../algorithms/scoring';
import {
  analyzeDiversity,
  analyzeHistory,
  calculateNumberSum,
  calculateRecentFrequency,
} from '../algorithms/statistics';
import {
  createHistory,
  validateHistoryDocument,
  validateLottoDraw,
  validateLottoHistory,
} from './historyValidation';
import { LocalLottoHistoryRepository } from './historyRepository';
import { CSV_HEADER, parseLottoCsv } from '../../../../scripts/lotto-csv';

const firstDraw = {
  drawNo: 1,
  drawDate: '2002-12-07',
  numbers: [10, 23, 29, 33, 37, 40],
  bonus: 16,
};
const secondDraw = {
  drawNo: 2,
  drawDate: '2002-12-14',
  numbers: [9, 13, 21, 25, 32, 42],
  bonus: 2,
};
const csv = `${CSV_HEADER.join(',')}\n1,2002-12-07,10,23,29,33,37,40,16\n2,2002-12-14,9,13,21,25,32,42,2\n`;

describe('historical data validation and provenance', () => {
  it('contains actual first and latest official draws, with contiguous dates and draw numbers', async () => {
    const { draws, metadata } = await validateHistoryDocument(bundled);
    expect(draws[0]).toEqual(firstDraw);
    expect(draws.find((draw) => draw.drawNo === 1246)).toEqual({
      drawNo: 1246,
      drawDate: '2026-10-17',
      numbers: [16, 22, 23, 24, 27, 28],
      bonus: 6,
    });
    expect(metadata.source.url).toContain('www.dhlottery.co.kr/lt645/');
    expect(
      draws.every(
        (draw, i) =>
          draw.drawNo === i + 1 &&
          new Date(`${draw.drawDate}T00:00:00Z`).getUTCDay() === 6,
      ),
    ).toBe(true);
  });
  it.each([
    ['drawNo', { ...firstDraw, drawNo: 0 }],
    ['drawNo', { ...firstDraw, drawNo: 1.5 }],
    ['numbers', { ...firstDraw, numbers: [1, 2, 3, 4, 5] }],
    ['numbers', { ...firstDraw, numbers: [1, 1, 3, 4, 5, 6] }],
    ['numbers', { ...firstDraw, numbers: [0, 2, 3, 4, 5, 6] }],
    ['numbers', { ...firstDraw, numbers: [1, 2, 3, 4, 5, 46] }],
    ['numbers', { ...firstDraw, numbers: ['1', 2, 3, 4, 5, 6] }],
    ['bonus', { ...firstDraw, bonus: 10 }],
    ['bonus', { ...firstDraw, bonus: 46 }],
    ['bonus', { ...firstDraw, bonus: 0 }],
    ['bonus', { ...firstDraw, bonus: 1.5 }],
    ['drawDate', { ...firstDraw, drawDate: '2026-02-30' }],
    ['drawDate', { ...firstDraw, drawDate: '12/07/2002' }],
  ])('identifies an invalid %s field', (field, input) => {
    expect(() => validateLottoDraw(input)).toThrow(`draw.${field}`);
  });
  it('reports duplicate draws, missing draws and reversed dates', () => {
    expect(() => validateLottoHistory([firstDraw, firstDraw])).toThrow('중복');
    expect(() =>
      validateLottoHistory([firstDraw, { ...secondDraw, drawNo: 3 }]),
    ).toThrow('누락');
    expect(() =>
      validateLottoHistory([
        firstDraw,
        { ...secondDraw, drawDate: '2002-12-01' },
      ]),
    ).toThrow('날짜 순서');
  });
  it('normalizes a copy without altering original ordering', () => {
    const shuffled = {
      ...firstDraw,
      numbers: [...firstDraw.numbers].reverse(),
    };
    expect(validateLottoHistory([secondDraw, shuffled])[0]).toEqual(firstDraw);
    expect(shuffled.numbers[0]).toBe(40);
  });
  it('computes metadata from validated data and verifies canonical SHA-256', async () => {
    const document = await createHistory(
      [secondDraw, firstDraw],
      bundled.metadata.source,
      '2026-10-22T00:00:00Z',
    );
    expect(document.metadata).toMatchObject({
      firstDraw: 1,
      latestDraw: 2,
      drawCount: 2,
      latestDrawDate: '2002-12-14',
      kind: 'historical',
    });
    await expect(validateHistoryDocument(document)).resolves.toEqual(document);
    await expect(
      validateHistoryDocument({
        ...document,
        metadata: { ...document.metadata, drawCount: 60 },
      }),
    ).rejects.toThrow('metadata.drawCount');
    await expect(
      validateHistoryDocument({
        ...document,
        draws: [{ ...firstDraw, bonus: 17 }, secondDraw],
      }),
    ).rejects.toThrow('metadata.dataSha256');
  });
  it('rejects missing data and synthetic documents without fallback', async () => {
    expect(() => validateLottoHistory([])).toThrow('실제');
    await expect(
      new LocalLottoHistoryRepository({
        metadata: { kind: 'synthetic' },
        draws: [firstDraw],
      }).getDraws(),
    ).rejects.toThrow('합성');
    await expect(
      new LocalLottoHistoryRepository({
        metadata: bundled.metadata,
        draws: [],
      }).getDraws(),
    ).rejects.toThrow('실제 당첨 이력이 없습니다');
    expect(() =>
      recommendGames(
        { draws: [], constraints: { fixed: [], excluded: [] } },
        seededRandom(1),
      ),
    ).toThrow('실제 당첨 이력이 없습니다');
  });
  it('rejects missing or invalid provenance metadata', async () => {
    await expect(
      createHistory(
        [firstDraw],
        { ...bundled.metadata.source, url: 'http://example.com' },
        '2026-10-22T00:00:00Z',
      ),
    ).rejects.toThrow('HTTPS');
    await expect(
      createHistory(
        [firstDraw],
        { ...bundled.metadata.source, sha256: 'bad' },
        '2026-10-22T00:00:00Z',
      ),
    ).rejects.toThrow('SHA-256');
    await expect(
      createHistory([firstDraw], bundled.metadata.source, 'not-a-date'),
    ).rejects.toThrow('lastUpdated');
  });
});

describe('offline CSV import', () => {
  it('accepts canonical CSV with BOM and Windows line endings', () => {
    expect(parseLottoCsv(`\uFEFF${csv.replaceAll('\n', '\r\n')}`)).toEqual([
      firstDraw,
      secondDraw,
    ]);
  });
  it('rejects ambiguous headers, formulas, invalid integers and duplicate draws', () => {
    expect(() => parseLottoCsv(csv.replace('drawNo', 'round'))).toThrow(
      'header',
    );
    expect(() => parseLottoCsv(csv.replace(',10,', ',=5+5,'))).toThrow('row 2');
    expect(() => parseLottoCsv(csv.replace(',10,', ',10.5,'))).toThrow(
      'integer',
    );
    expect(() => parseLottoCsv(`${csv}${csv.split('\n')[1]}\n`)).toThrow(
      '중복',
    );
  });
  it('keeps an existing output untouched when importing an invalid CSV', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lotto-import-'));
    const input = join(directory, 'bad.csv');
    const output = join(directory, 'history.json');
    await writeFile(input, 'invalid');
    await writeFile(output, 'preserve-me');
    expect(() =>
      execFileSync(
        process.execPath,
        [
          'node_modules/tsx/dist/cli.mjs',
          'scripts/import-lotto-history.ts',
          input,
          '--source-url',
          bundled.metadata.source.url,
          '--source-name',
          'official',
          '--output',
          output,
        ],
        { stdio: 'pipe' },
      ),
    ).toThrow();
    expect(await readFile(output, 'utf8')).toBe('preserve-me');
  });
});

describe('statistics and selection on real history', () => {
  it('recalculates full, recent 10/30/50 and all requested distribution totals', async () => {
    const draws = await new LocalLottoHistoryRepository().getDraws();
    const stats = analyzeHistory(draws);
    expect(calculateNumberSum(stats.frequency)).toBe(draws.length * 6);
    for (const window of [10, 30, 50] as const) {
      expect(calculateNumberSum(stats.recentFrequencies[window])).toBe(
        window * 6,
      );
      expect(stats.recentFrequencies[window]).toEqual(
        calculateRecentFrequency([...draws].reverse(), window),
      );
    }
    for (const counts of [
      stats.distributions.odd,
      stats.distributions.low,
      stats.distributions.consecutive,
      stats.distributions.acValue,
      ...stats.distributions.ranges,
    ])
      expect(calculateNumberSum(counts)).toBe(draws.length);
    expect(calculateNumberSum(stats.distributions.endings)).toBe(
      draws.length * 6,
    );
    expect(stats.sums?.mean).toBeGreaterThan(130);
    expect(stats.sums?.mean).toBeLessThan(145);
    const latest = draws.at(-1)!;
    latest.numbers.forEach((n) => expect(stats.overdue[n]).toBe(0));
  });
  it('limits correlated frequency weight, reduces AC weight and scores no overdue assumption', () => {
    expect(
      LOTTO_SCORE_WEIGHTS.frequency + LOTTO_SCORE_WEIGHTS.recentFrequency,
    ).toBeCloseTo(0.06);
    expect(LOTTO_SCORE_WEIGHTS.acValue).toBeLessThanOrEqual(0.05);
    const stats = analyzeHistory([
      validateLottoDraw(firstDraw),
      validateLottoDraw(secondDraw),
    ]);
    const numbers = firstDraw.numbers;
    expect(
      calculateCombinationScore(numbers, {
        ...stats,
        overdue: Array(46).fill(999),
      }).score,
    ).toBe(calculateCombinationScore(numbers, stats).score);
    expect(
      empiricalDistributionScore([0, 0, 0, 100, 0, 0, 0], 0),
    ).toBeGreaterThan(0.25);
    expect(empiricalDistributionScore([0, 0, 0, 100, 0, 0, 0], 0)).toBeLessThan(
      1,
    );
  });
  it('exposes explicit diversity metrics and protects quality against maximal coverage', () => {
    const stats = analyzeHistory([validateLottoDraw(firstDraw)]);
    const strong = {
      ...calculateCombinationScore([1, 2, 3, 4, 5, 6], stats),
      score: 95,
    };
    const similar = {
      ...calculateCombinationScore([1, 2, 3, 4, 5, 7], stats),
      score: 94,
    };
    const weak = {
      ...calculateCombinationScore([40, 41, 42, 43, 44, 45], stats),
      score: 10,
    };
    const selected = diversifyGames([strong, similar, weak], 2);
    expect(selected).not.toContain(weak);
    expect(
      analyzeDiversity([
        [1, 2, 3, 4, 5, 6],
        [1, 2, 7, 8, 9, 10],
      ]),
    ).toMatchObject({
      uniqueNumberCount: 10,
      averagePairSimilarity: 2,
      maxPairSimilarity: 2,
      numberUsageCount: expect.any(Array),
    });
  });
  it('reproduces real-data recommendations from identical history, config and seed', async () => {
    const draws = await new LocalLottoHistoryRepository().getDraws();
    const request = { draws, constraints: { fixed: [], excluded: [] } };
    expect(recommendGames(request, seededRandom(20261022))).toEqual(
      recommendGames(request, seededRandom(20261022)),
    );
  });
});
