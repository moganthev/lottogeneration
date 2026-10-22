import { LOTTO_CONFIG, LOTTO_SCORE_WEIGHTS } from '../config';
import type { LottoGame, LottoStatistics } from '../types';
import { analyzeGame, calculateNumberSum } from './statistics';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Soft empirical preference with Laplace smoothing and a non-zero floor.
// Uncommon shapes remain valid; these values are not estimated winning probabilities.
export function empiricalDistributionScore(histogram: number[], value: number) {
  const maximum = Math.max(0, ...histogram);
  if (!maximum) return 0.5;
  return (
    LOTTO_CONFIG.distributionFloor +
    (1 - LOTTO_CONFIG.distributionFloor) *
      Math.sqrt(((histogram[value] ?? 0) + 1) / (maximum + 1))
  );
}

export function calculateCombinationScore(
  numbers: number[],
  statistics: LottoStatistics,
  includeHistorical = true,
): LottoGame {
  const a = analyzeGame(numbers, statistics, includeHistorical);
  const averageFrequency = (counts: number[]) => {
    const max = Math.max(0, ...counts);
    return max
      ? calculateNumberSum(numbers.map((n) => counts[n] / max)) / numbers.length
      : 0.5;
  };
  const sums = statistics.sums;
  const parts: Record<keyof typeof LOTTO_SCORE_WEIGHTS, number> = {
    frequency: averageFrequency(statistics.frequency),
    recentFrequency: averageFrequency(statistics.recentFrequency),
    oddEven: empiricalDistributionScore(statistics.distributions.odd, a.odd),
    lowHigh: empiricalDistributionScore(statistics.distributions.low, a.low),
    rangeDistribution:
      calculateNumberSum(
        a.ranges.map((count, range) =>
          empiricalDistributionScore(
            statistics.distributions.ranges[range],
            count,
          ),
        ),
      ) / a.ranges.length,
    sum: sums
      ? Math.exp(
          -0.5 *
            ((a.sum - sums.mean) / Math.max(1, sums.standardDeviation)) ** 2,
        )
      : 0.5,
    consecutive: clamp(1 - Math.max(0, a.longestRun - 2) / 4),
    endingDigit: clamp(1 - Math.max(0, Math.max(...a.endings) - 2) / 4),
    gap: clamp(1 - Math.max(0, Math.max(...a.gaps) - 15) / 25),
    acValue: clamp(a.acValue / 10),
  };
  const weightSum = calculateNumberSum(Object.values(LOTTO_SCORE_WEIGHTS));
  const total = Object.entries(LOTTO_SCORE_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + weight * parts[key as keyof typeof parts],
    0,
  );
  return {
    numbers: [...numbers],
    score: Math.round((100 * total) / weightSum),
    analysis: a,
    scoreBreakdown: Object.fromEntries(
      Object.entries(parts).map(([key, value]) => [
        key,
        Math.round(value * 100),
      ]),
    ),
  };
}
