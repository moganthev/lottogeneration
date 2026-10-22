import { LOTTO_CONFIG } from '../config';
import type { LottoDraw, LottoGameAnalysis, LottoStatistics } from '../types';

export const calculateNumberSum = (numbers: readonly number[]) =>
  numbers.reduce((sum, n) => sum + n, 0);

export function calculateOddEven(numbers: readonly number[]) {
  const odd = numbers.filter((n) => n % 2 !== 0).length;
  return { odd, even: numbers.length - odd };
}

export function calculateLowHigh(numbers: readonly number[]) {
  const low = numbers.filter((n) => n <= LOTTO_CONFIG.lowMax).length;
  return { low, high: numbers.length - low };
}

export function calculateRangeDistribution(numbers: readonly number[]) {
  const ranges = Array<number>(5).fill(0);
  numbers.forEach((n) => ranges[Math.floor((n - 1) / 10)]++);
  return ranges;
}

export function calculateEndingDigitDistribution(numbers: readonly number[]) {
  const endings = Array<number>(10).fill(0);
  numbers.forEach((n) => endings[n % 10]++);
  return endings;
}

export function calculateGaps(numbers: readonly number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted.slice(1).map((n, i) => n - sorted[i]);
}

export function calculateConsecutive(numbers: readonly number[]) {
  let consecutive = 0;
  let run = numbers.length ? 1 : 0;
  let longestRun = run;
  for (const gap of calculateGaps(numbers)) {
    if (gap === 1) {
      consecutive++;
      run++;
      longestRun = Math.max(longestRun, run);
    } else run = 1;
  }
  return { consecutive, longestRun };
}

// Arithmetic Complexity: distinct positive pairwise differences minus (n - 1).
export function calculateAcValue(numbers: readonly number[]) {
  const differences = new Set<number>();
  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const difference = Math.abs(numbers[j] - numbers[i]);
      if (difference > 0) differences.add(difference);
    }
  }
  return Math.max(0, differences.size - Math.max(0, numbers.length - 1));
}

export function calculateSimilarity(
  a: readonly number[],
  b: readonly number[],
) {
  const other = new Set(b);
  return new Set(a.filter((n) => other.has(n))).size;
}

export function calculateHistoricalSimilarity(
  numbers: readonly number[],
  draws: LottoDraw[],
) {
  return Math.max(
    0,
    ...draws.map((draw) => calculateSimilarity(numbers, draw.numbers)),
  );
}

export function calculateNumberFrequency(draws: LottoDraw[]) {
  const frequency = Array<number>(LOTTO_CONFIG.max + 1).fill(0);
  draws.forEach((draw) => draw.numbers.forEach((n) => frequency[n]++));
  return frequency;
}

export function calculateRecentFrequency(
  draws: LottoDraw[],
  window: number = LOTTO_CONFIG.recentWindow,
) {
  return calculateNumberFrequency(
    [...draws].sort((a, b) => b.drawNo - a.drawNo).slice(0, window),
  );
}

export function calculateOverdueScore(draws: LottoDraw[]) {
  const sorted = [...draws].sort((a, b) => b.drawNo - a.drawNo);
  return Array.from({ length: LOTTO_CONFIG.max + 1 }, (_, n) => {
    const index = sorted.findIndex((draw) => draw.numbers.includes(n));
    return index === -1 ? draws.length : index;
  });
}

function quantile(sorted: number[], fraction: number) {
  const index = (sorted.length - 1) * fraction;
  const left = Math.floor(index);
  return (
    sorted[left] + (sorted[Math.ceil(index)] - sorted[left]) * (index - left)
  );
}

export function calculateSumStatistics(draws: LottoDraw[]) {
  if (!draws.length) return null;
  const sums = draws
    .map((draw) => calculateNumberSum(draw.numbers))
    .sort((a, b) => a - b);
  const mean = calculateNumberSum(sums) / sums.length;
  return {
    mean,
    median: quantile(sums, 0.5),
    standardDeviation: Math.sqrt(
      sums.reduce((total, sum) => total + (sum - mean) ** 2, 0) / sums.length,
    ),
    lowerQuartile: quantile(sums, 0.25),
    upperQuartile: quantile(sums, 0.75),
  };
}

export function analyzeHistory(draws: LottoDraw[]): LottoStatistics {
  const distributions = {
    odd: Array<number>(7).fill(0),
    low: Array<number>(7).fill(0),
    ranges: Array.from({ length: 5 }, () => Array<number>(7).fill(0)),
    consecutive: Array<number>(6).fill(0),
    endings: Array<number>(10).fill(0),
    acValue: Array<number>(11).fill(0),
  };
  for (const draw of draws) {
    distributions.odd[calculateOddEven(draw.numbers).odd]++;
    distributions.low[calculateLowHigh(draw.numbers).low]++;
    calculateRangeDistribution(draw.numbers).forEach(
      (count, range) => distributions.ranges[range][count]++,
    );
    distributions.consecutive[calculateConsecutive(draw.numbers).consecutive]++;
    calculateEndingDigitDistribution(draw.numbers).forEach(
      (count, digit) => (distributions.endings[digit] += count),
    );
    distributions.acValue[calculateAcValue(draw.numbers)]++;
  }
  return {
    drawCount: draws.length,
    distributions,
    recentFrequencies: {
      10: calculateRecentFrequency(draws, 10),
      30: calculateRecentFrequency(draws, 30),
      50: calculateRecentFrequency(draws, 50),
    },
    frequency: calculateNumberFrequency(draws),
    recentFrequency: calculateRecentFrequency(draws),
    overdue: calculateOverdueScore(draws),
    sums: calculateSumStatistics(draws),
    draws,
  };
}

export function analyzeGame(
  numbers: number[],
  statistics: LottoStatistics,
  includeHistorical = true,
): LottoGameAnalysis {
  return {
    ...calculateOddEven(numbers),
    ...calculateLowHigh(numbers),
    ...calculateConsecutive(numbers),
    sum: calculateNumberSum(numbers),
    ranges: calculateRangeDistribution(numbers),
    endings: calculateEndingDigitDistribution(numbers),
    gaps: calculateGaps(numbers),
    acValue: calculateAcValue(numbers),
    historicalSimilarity: includeHistorical
      ? calculateHistoricalSimilarity(numbers, statistics.draws)
      : 0,
    overdueNumbers: numbers.filter((n) => statistics.overdue[n] >= 10),
    recentAppearances: calculateNumberSum(
      numbers.map((n) => statistics.recentFrequency[n]),
    ),
  };
}

export function analyzeDiversity(games: readonly number[][]) {
  const usage = Array<number>(LOTTO_CONFIG.max + 1).fill(0);
  games.flat().forEach((n) => usage[n]++);
  const overlaps: number[] = [];
  games.forEach((game, i) =>
    games
      .slice(i + 1)
      .forEach((other) => overlaps.push(calculateSimilarity(game, other))),
  );
  const uniqueCount = usage.filter((count) => count > 0).length;
  const averageOverlap = overlaps.length
    ? calculateNumberSum(overlaps) / overlaps.length
    : 0;
  const maxOverlap = Math.max(0, ...overlaps);
  return {
    uniqueNumberCount: uniqueCount,
    averagePairSimilarity: averageOverlap,
    maxPairSimilarity: maxOverlap,
    numberUsageCount: usage,
    uniqueCount,
    maxRepetition: Math.max(0, ...usage),
    averageOverlap: overlaps.length
      ? calculateNumberSum(overlaps) / overlaps.length
      : 0,
    maxOverlap: Math.max(0, ...overlaps),
    usage,
  };
}
