import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { seededRandom, shuffle } from '../src/shared/random';
import { recommendGames } from '../src/features/lotto/algorithms/recommend';
import {
  analyzeDiversity,
  analyzeHistory,
  calculateNumberSum,
  calculateOddEven,
} from '../src/features/lotto/algorithms/statistics';
import { validateHistoryDocument } from '../src/features/lotto/services/historyValidation';
import {
  LOTTO_CONFIG,
  LOTTO_SCORE_WEIGHTS,
} from '../src/features/lotto/config';

const { values } = parseArgs({
  options: {
    iterations: { type: 'string', default: '200' },
    seed: { type: 'string', default: '20261022' },
    output: { type: 'string' },
  },
});

async function main() {
  const iterations = Number(values.iterations);
  const seed = Number(values.seed);
  if (
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > 10000 ||
    !Number.isSafeInteger(seed)
  )
    throw new Error(
      'iterations must be 1–10000 and seed must be a safe integer',
    );
  const history = await validateHistoryDocument(
    JSON.parse(
      await readFile('src/features/lotto/data/lotto-history.json', 'utf8'),
    ),
  );
  const random = seededRandom(seed);
  const baselineRandom = seededRandom(seed);
  const frequency = Array<number>(46).fill(0);
  const baselineFrequency = Array<number>(46).fill(0);
  const oddDistribution = Array<number>(7).fill(0);
  const sumDistribution = Array<number>(28).fill(0);
  const scores: number[] = [];
  const sums: number[] = [];
  const uniqueCounts: number[] = [];
  const pairSimilarities: number[] = [];
  const maxPairSimilarities: number[] = [];
  const bestCandidateScores: number[] = [];
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const games = recommendGames(
      { draws: history.draws, constraints: { fixed: [], excluded: [] } },
      random,
    );
    const diversity = analyzeDiversity(games.map((game) => game.numbers));
    uniqueCounts.push(diversity.uniqueNumberCount);
    pairSimilarities.push(diversity.averagePairSimilarity);
    maxPairSimilarities.push(diversity.maxPairSimilarity);
    bestCandidateScores.push(Math.max(...games.map((game) => game.score)));
    for (const game of games) {
      scores.push(game.score);
      sums.push(game.analysis.sum);
      oddDistribution[game.analysis.odd]++;
      sumDistribution[Math.floor(game.analysis.sum / 10)]++;
      game.numbers.forEach((n) => frequency[n]++);
      shuffle(
        Array.from({ length: 45 }, (_, n) => n + 1),
        baselineRandom,
      )
        .slice(0, 6)
        .forEach((n) => baselineFrequency[n]++);
    }
  }
  const average = (numbers: number[]) =>
    calculateNumberSum(numbers) / numbers.length;
  const expected =
    (iterations * LOTTO_CONFIG.games * LOTTO_CONFIG.size) / LOTTO_CONFIG.max;
  const selection = frequency.slice(1).map((count, i) => ({
    number: i + 1,
    count,
    baselineCount: baselineFrequency[i + 1],
    ratioToUniformMean: Number((count / expected).toFixed(3)),
  }));
  const maximum = Math.max(...frequency.slice(1));
  const minimum = Math.min(...frequency.slice(1));
  const statistics = analyzeHistory(history.draws);
  const report = {
    note: 'Descriptive selection-bias audit, not a backtest of winning probability. Unconstrained recommendations only. The uniform baseline samples five independent games; it does not diversify them.',
    data: { ...history.metadata },
    config: { ...LOTTO_CONFIG, weights: LOTTO_SCORE_WEIGHTS },
    seed,
    iterations,
    games: scores.length,
    averageScore: average(scores),
    minimumScore: Math.min(...scores),
    maximumScore: Math.max(...scores),
    averageBestSelectedScore: average(bestCandidateScores),
    averageUniqueNumberCount: average(uniqueCounts),
    averagePairSimilarity: average(pairSimilarities),
    maximumPairSimilarity: Math.max(...maxPairSimilarities),
    averageNumberSum: average(sums),
    minimumSum: Math.min(...sums),
    maximumSum: Math.max(...sums),
    oddDistribution,
    sumDistributionByTens: sumDistribution,
    selectionFrequency: selection,
    bias: {
      expectedCountPerNumber: expected,
      maximumToMean: maximum / expected,
      minimumToMean: minimum / expected,
      maxToMin: maximum / Math.max(1, minimum),
      coefficientOfVariation:
        Math.sqrt(
          average(frequency.slice(1).map((count) => (count - expected) ** 2)),
        ) / expected,
      reviewThreshold: 1.5,
      flaggedNumbers: selection
        .filter((n) => n.ratioToUniformMean > 1.5 || n.ratioToUniformMean < 0.5)
        .map((n) => n.number),
    },
    historicalChecks: {
      numberFrequencyTotal: calculateNumberSum(statistics.frequency),
      recentTotals: Object.fromEntries(
        Object.entries(statistics.recentFrequencies).map(([window, counts]) => [
          window,
          calculateNumberSum(counts),
        ]),
      ),
      sums: statistics.sums,
      odd: statistics.distributions.odd,
      low: statistics.distributions.low,
      ranges: statistics.distributions.ranges,
      consecutive: statistics.distributions.consecutive,
      endings: statistics.distributions.endings,
      acValue: statistics.distributions.acValue,
      firstDrawOdd: calculateOddEven(history.draws[0].numbers),
    },
    durationMs: Math.round(performance.now() - start),
  };
  if (values.output)
    await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
