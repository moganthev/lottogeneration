export const LOTTO_CONFIG = {
  min: 1,
  max: 45,
  size: 6,
  games: 5,
  lowMax: 22,
  recentWindow: 30,
  candidateCount: 5_000,
  rankingPool: 500,
  overlapPenalty: 9,
  repetitionPenalty: 3,
  coverageReward: 3,
  minimumRelativeScore: 0.85,
  distributionFloor: 0.25,
} as const;

export const LOTTO_SCORE_WEIGHTS = {
  frequency: 0.04,
  recentFrequency: 0.02,
  oddEven: 0.17,
  lowHigh: 0.13,
  rangeDistribution: 0.16,
  sum: 0.2,
  consecutive: 0.08,
  endingDigit: 0.07,
  gap: 0.08,
  acValue: 0.05,
} as const;
