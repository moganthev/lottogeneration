import {
  browserRandom,
  shuffle,
  type RandomSource,
} from '../../../shared/random';
import { LOTTO_CONFIG } from '../config';
import type {
  LottoConstraints,
  LottoGame,
  RecommendationRequest,
} from '../types';
import {
  analyzeDiversity,
  analyzeHistory,
  calculateSimilarity,
} from './statistics';
import { calculateCombinationScore } from './scoring';

import { combinationCount, validateConstraints } from './constraints';
import { validateLottoHistory } from '../services/historyValidation';
export {
  isLottoNumbers,
  combinationCount,
  validateConstraints,
} from './constraints';

export function generateCandidates(
  constraints: LottoConstraints,
  random: RandomSource,
  limit: number = LOTTO_CONFIG.candidateCount,
) {
  validateConstraints(constraints);
  const pool = Array.from({ length: LOTTO_CONFIG.max }, (_, i) => i + 1).filter(
    (n) => !constraints.fixed.includes(n) && !constraints.excluded.includes(n),
  );
  const k = LOTTO_CONFIG.size - constraints.fixed.length;
  const target = Math.min(limit, combinationCount(pool.length, k));
  const candidates = new Map<string, number[]>();
  const add = (picked: number[]) => {
    const numbers = [...constraints.fixed, ...picked].sort((a, b) => a - b);
    candidates.set(numbers.join(','), numbers);
  };
  if (combinationCount(pool.length, k) <= limit) {
    const visit = (start: number, picked: number[]) => {
      if (picked.length === k) {
        add(picked);
        return;
      }
      for (let i = start; i <= pool.length - (k - picked.length); i++)
        visit(i + 1, [...picked, pool[i]]);
    };
    visit(0, []);
  } else {
    for (
      let attempt = 0;
      candidates.size < target && attempt < target * 20;
      attempt++
    )
      add(shuffle(pool, random).slice(0, k));
  }
  return [...candidates.values()];
}

export function diversifyGames(
  candidates: LottoGame[],
  count: number,
  retained: number[][] = [],
) {
  const selected: LottoGame[] = [];
  const bestCombinationScore = Math.max(
    0,
    ...candidates.map((game) => game.score),
  );
  const minimumForCount =
    [...candidates].sort((a, b) => b.score - a.score)[count - 1]?.score ?? 0;
  const cutoff = Math.min(
    bestCombinationScore * LOTTO_CONFIG.minimumRelativeScore,
    minimumForCount,
  );
  const remaining = candidates.filter((game) => game.score >= cutoff);
  while (selected.length < count && remaining.length) {
    const current = [...retained, ...selected.map((game) => game.numbers)];
    const diversity = analyzeDiversity(current);
    let bestIndex = 0;
    let bestScore = -Infinity;
    remaining.forEach((game, index) => {
      const maxOverlap = Math.max(
        0,
        ...current.map((other) => calculateSimilarity(game.numbers, other)),
      );
      const repeated = game.numbers.reduce(
        (sum, n) => sum + diversity.usage[n],
        0,
      );
      const newNumbers = game.numbers.filter(
        (n) => diversity.usage[n] === 0,
      ).length;
      const score =
        game.score +
        newNumbers * LOTTO_CONFIG.coverageReward -
        maxOverlap * LOTTO_CONFIG.overlapPenalty -
        repeated * LOTTO_CONFIG.repetitionPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

export function recommendGames(
  request: RecommendationRequest,
  random: RandomSource = browserRandom,
): LottoGame[] {
  const {
    draws,
    constraints,
    retained = [],
    avoid = [],
    count = LOTTO_CONFIG.games,
  } = request;
  if (!Number.isInteger(count) || count < 1 || count > LOTTO_CONFIG.games)
    throw new Error('추천 게임 수가 올바르지 않습니다.');
  validateConstraints(constraints);
  const statistics = analyzeHistory(validateLottoHistory(draws));
  const forbidden = new Set(
    [...retained, ...avoid].map((n) => [...n].sort((a, b) => a - b).join(',')),
  );
  const ranked = generateCandidates(constraints, random)
    .filter((numbers) => !forbidden.has(numbers.join(',')))
    .map((numbers) => calculateCombinationScore(numbers, statistics, false))
    .sort((a, b) => b.score - a.score)
    .slice(0, LOTTO_CONFIG.rankingPool);
  const result = diversifyGames(ranked, count, retained);
  if (result.length !== count)
    throw new Error(
      '다른 조합을 만들 수 없습니다. 번호 조건을 조금 완화해 주세요.',
    );
  return result.map((game) =>
    calculateCombinationScore(game.numbers, statistics),
  );
}
