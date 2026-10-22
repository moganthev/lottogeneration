import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../../shared/random';
import { LOTTO_CONFIG, LOTTO_SCORE_WEIGHTS } from '../config';
import {
  LocalLottoHistoryRepository,
  validateDraws,
} from '../services/historyRepository';
import type { LottoDraw } from '../types';
import { validateLottoDraw } from '../services/historyValidation';
import {
  combinationCount,
  generateCandidates,
  recommendGames,
  validateConstraints,
} from './recommend';
import { calculateCombinationScore } from './scoring';
import {
  analyzeDiversity,
  analyzeHistory,
  analyzeGame,
  calculateAcValue,
  calculateConsecutive,
  calculateEndingDigitDistribution,
  calculateGaps,
  calculateHistoricalSimilarity,
  calculateLowHigh,
  calculateNumberFrequency,
  calculateNumberSum,
  calculateOddEven,
  calculateOverdueScore,
  calculateRangeDistribution,
  calculateRecentFrequency,
  calculateSimilarity,
  calculateSumStatistics,
} from './statistics';

const history: LottoDraw[] = [
  { drawNo: 1, drawDate: '2002-12-07', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { drawNo: 2, drawDate: '2002-12-14', numbers: [2, 3, 4, 5, 6, 7], bonus: 8 },
];

describe('independent statistics', () => {
  it('calculates sums and odd/even distribution', () => {
    expect(calculateNumberSum([3, 11, 17, 24, 32, 41])).toBe(128);
    expect(calculateOddEven([3, 11, 17, 24, 32, 41])).toEqual({
      odd: 4,
      even: 2,
    });
  });
  it('uses the 22/23 boundary for low/high', () => {
    expect(calculateLowHigh([1, 10, 22, 23, 40, 45])).toEqual({
      low: 3,
      high: 3,
    });
  });
  it('uses correct boundaries for five ranges', () => {
    expect(calculateRangeDistribution([1, 10, 11, 20, 31, 45])).toEqual([
      2, 2, 0, 1, 1,
    ]);
  });
  it('counts consecutive pairs and longest run without excluding a pair', () => {
    expect(calculateConsecutive([13, 12, 28, 27, 41, 45])).toEqual({
      consecutive: 2,
      longestRun: 2,
    });
    expect(calculateConsecutive([10, 11, 12, 13, 30, 40])).toEqual({
      consecutive: 3,
      longestRun: 4,
    });
  });
  it('counts matching ending digits including zero', () => {
    expect(calculateEndingDigitDistribution([3, 13, 23, 33, 10, 40])).toEqual([
      2, 0, 0, 4, 0, 0, 0, 0, 0, 0,
    ]);
  });
  it('sorts a copy for gap analysis', () => {
    const numbers = [41, 3, 17, 24, 32, 11];
    expect(calculateGaps(numbers)).toEqual([8, 6, 7, 8, 9]);
    expect(numbers[0]).toBe(41);
  });
  it.each([
    [[1, 2, 3, 4, 5, 6], 0],
    [[1, 2, 4, 8, 16, 32], 10],
  ])('calculates arithmetic complexity for %s', (numbers, ac) => {
    expect(calculateAcValue(numbers as number[])).toBe(ac);
  });
  it('counts intersections, ignoring order and duplicates', () => {
    expect(calculateSimilarity([1, 2, 3, 4, 5, 6], [6, 5, 7, 8, 9, 10])).toBe(
      2,
    );
    expect(calculateSimilarity([1, 1], [1, 1])).toBe(1);
  });
  it('reports historical similarity as information', () => {
    expect(calculateHistoricalSimilarity(history[0].numbers, history)).toBe(6);
    expect(calculateHistoricalSimilarity([40, 41, 42, 43, 44, 45], [])).toBe(0);
  });
  it('counts winning numbers, excluding the bonus', () => {
    const frequency = calculateNumberFrequency(history);
    expect(frequency[1]).toBe(1);
    expect(frequency[2]).toBe(2);
    expect(frequency[8]).toBe(0);
    expect(calculateNumberSum(frequency)).toBe(12);
  });
  it('selects recent draws by round, not input order', () => {
    expect(calculateRecentFrequency(history, 1)[1]).toBe(0);
    expect(calculateRecentFrequency([...history].reverse(), 1)[7]).toBe(1);
  });
  it('measures absence in draws, including never seen numbers', () => {
    const overdue = calculateOverdueScore(history);
    expect(overdue[7]).toBe(0);
    expect(overdue[1]).toBe(1);
    expect(overdue[45]).toBe(2);
  });
  it('derives sum mean, median, standard deviation and quartiles from history', () => {
    expect(calculateSumStatistics(history)).toEqual({
      mean: 24,
      median: 24,
      standardDeviation: 3,
      lowerQuartile: 22.5,
      upperQuartile: 25.5,
    });
    expect(calculateSumStatistics([])).toBeNull();
  });
  it('reports unique coverage, repetition, average overlap and maximum overlap', () => {
    const result = analyzeDiversity([
      [1, 2, 3, 4, 5, 6],
      [1, 2, 7, 8, 9, 10],
    ]);
    expect(result).toMatchObject({
      uniqueCount: 10,
      maxRepetition: 2,
      averageOverlap: 2,
      maxOverlap: 2,
    });
    expect(analyzeDiversity([])).toMatchObject({
      uniqueCount: 0,
      averageOverlap: 0,
      maxOverlap: 0,
    });
  });
});

describe('combination scoring', () => {
  it('normalizes weights and produces finite scores between zero and 100', () => {
    expect(calculateNumberSum(Object.values(LOTTO_SCORE_WEIGHTS))).toBeCloseTo(
      1,
    );
    for (const numbers of generateCandidates(
      { fixed: [], excluded: [] },
      seededRandom(12),
      100,
    )) {
      const game = calculateCombinationScore(numbers, analyzeHistory(history));
      expect(game.score).toBeGreaterThanOrEqual(0);
      expect(game.score).toBeLessThanOrEqual(100);
      expect(
        Object.values(game.scoreBreakdown).every(
          (n) => Number.isFinite(n) && n >= 0 && n <= 100,
        ),
      ).toBe(true);
    }
  });
  it('bases sum score on the actual distribution', () => {
    const game = calculateCombinationScore(
      history[0].numbers,
      analyzeHistory(history),
    );
    expect(game.scoreBreakdown.sum).toBe(61); // exp(-0.5 * ((21-24)/3)^2)
    expect(game.analysis).toEqual(
      analyzeGame(history[0].numbers, analyzeHistory(history)),
    );
    const shifted = history.map((draw) =>
      validateLottoDraw({
        ...draw,
        numbers: draw.numbers.map((n) => n + 20),
      }),
    );
    expect(
      calculateCombinationScore(history[0].numbers, analyzeHistory(shifted))
        .scoreBreakdown.sum,
    ).toBe(0);
  });
  it('handles empty histories and a zero-variance sum distribution', () => {
    expect(
      calculateCombinationScore(history[0].numbers, analyzeHistory([]))
        .scoreBreakdown.sum,
    ).toBe(50);
    expect(
      calculateCombinationScore(
        history[0].numbers,
        analyzeHistory([history[0]]),
      ).scoreBreakdown.sum,
    ).toBe(100);
  });
  it('does not prohibit historical combinations or consecutive pairs', () => {
    expect(
      calculateCombinationScore([1, 2, 4, 8, 16, 32], analyzeHistory(history))
        .scoreBreakdown.consecutive,
    ).toBe(100);
    expect(
      calculateCombinationScore(history[0].numbers, analyzeHistory(history))
        .score,
    ).toBeGreaterThan(0);
  });
});

describe('constraints and generation', () => {
  it.each([
    { fixed: [7], excluded: [7] },
    { fixed: [0], excluded: [] },
    { fixed: [7, 7], excluded: [] },
    { fixed: [46], excluded: [] },
    { fixed: [1, 2, 3, 4, 5, 6], excluded: [] },
    { fixed: [1.5], excluded: [] },
    { fixed: [], excluded: Array.from({ length: 39 }, (_, i) => i + 1) },
  ])('rejects invalid or impossible constraints %j', (constraints) => {
    expect(() => validateConstraints(constraints)).toThrow();
  });
  it('counts available combinations exactly', () => {
    expect(combinationCount(45, 6)).toBe(8145060);
    expect(combinationCount(6, 6)).toBe(1);
    expect(combinationCount(3, 6)).toBe(0);
  });
  it('generates the configured 5,000 unique candidates', () => {
    const candidates = generateCandidates(
      { fixed: [], excluded: [] },
      seededRandom(42),
    );
    expect(candidates).toHaveLength(LOTTO_CONFIG.candidateCount);
    expect(new Set(candidates.map((n) => n.join(','))).size).toBe(
      LOTTO_CONFIG.candidateCount,
    );
  });
  it.each([1, 42, 2026])(
    'returns five valid distinct games with seed %i',
    (seed) => {
      const games = recommendGames(
        {
          draws: history,
          constraints: { fixed: [7, 21], excluded: [4, 13, 44] },
        },
        seededRandom(seed),
      );
      expect(games).toHaveLength(5);
      expect(new Set(games.map((g) => g.numbers.join(','))).size).toBe(5);
      for (const { numbers } of games) {
        expect(numbers).toHaveLength(6);
        expect(new Set(numbers).size).toBe(6);
        expect(numbers.every((n) => n >= 1 && n <= 45)).toBe(true);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(numbers).toEqual(expect.arrayContaining([7, 21]));
        expect(numbers.some((n) => [4, 13, 44].includes(n))).toBe(false);
      }
    },
  );
  it('selects broadly diverse games from a realistic sample', async () => {
    const draws = await new LocalLottoHistoryRepository().getDraws();
    const games = recommendGames(
      { draws, constraints: { fixed: [], excluded: [] } },
      seededRandom(100),
    );
    const diversity = analyzeDiversity(games.map((g) => g.numbers));
    expect(diversity.uniqueCount).toBeGreaterThanOrEqual(25);
    expect(diversity.maxOverlap).toBeLessThanOrEqual(2);
  });
  it('rerolls one game against four retained games and avoids its old result', () => {
    const constraints = { fixed: [7], excluded: [44] };
    const original = recommendGames(
      { draws: history, constraints },
      seededRandom(1),
    );
    const held = original.slice(1).map((g) => [...g.numbers]);
    const copy = structuredClone(held);
    const next = recommendGames(
      {
        draws: history,
        constraints,
        retained: held,
        avoid: [original[0].numbers],
        count: 1,
      },
      seededRandom(2),
    );
    expect(next).toHaveLength(1);
    expect(held).toEqual(copy);
    expect(next[0].numbers).not.toEqual(original[0].numbers);
    expect(held.some((n) => n.join(',') === next[0].numbers.join(','))).toBe(
      false,
    );
  });
  it('enumerates a narrow pool instead of looping on duplicate candidates', () => {
    const fixed = [1, 2, 3, 4, 5];
    const excluded = Array.from({ length: 35 }, (_, i) => i + 11);
    const games = recommendGames(
      { draws: history, constraints: { fixed, excluded } },
      seededRandom(1),
    );
    expect(games).toHaveLength(5);
    expect(new Set(games.map((game) => game.numbers[5]))).toEqual(
      new Set([6, 7, 8, 9, 10]),
    );
    expect(() =>
      recommendGames(
        {
          draws: history,
          constraints: { fixed, excluded },
          count: 1,
          retained: games.slice(1).map((g) => g.numbers),
          avoid: [games[0].numbers],
        },
        seededRandom(2),
      ),
    ).toThrow('다른 조합');
  });
  it('reproduces recommendations from the same seed', () => {
    const request = {
      draws: history,
      constraints: { fixed: [], excluded: [] },
    };
    expect(recommendGames(request, seededRandom(321))).toEqual(
      recommendGames(request, seededRandom(321)),
    );
  });
});

describe('history repository', () => {
  it('loads verified historical draws through the repository interface', async () => {
    const draws = await new LocalLottoHistoryRepository().getDraws();
    expect(draws.length).toBeGreaterThanOrEqual(1246);
    expect(validateDraws(draws)).toEqual(draws);
  });
  it('rejects duplicate rounds, repeated numbers and invalid bonuses', () => {
    expect(() => validateDraws([history[0], history[0]])).toThrow();
    expect(() => validateDraws([{ ...history[0], bonus: 1 }])).toThrow();
    expect(() =>
      validateDraws([{ ...history[0], numbers: [1, 1, 2, 3, 4, 5] }]),
    ).toThrow();
  });
});
