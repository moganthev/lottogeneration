export type LottoNumbers = [number, number, number, number, number, number];

export interface LottoDraw {
  drawNo: number;
  drawDate: string;
  numbers: LottoNumbers;
  bonus: number;
}

export interface LottoHistorySource {
  name: string;
  url: string;
  retrievedAt: string;
  sha256: string;
}

export interface LottoHistoryMetadata {
  kind: 'historical';
  firstDraw: number;
  latestDraw: number;
  drawCount: number;
  latestDrawDate: string;
  lastUpdated: string;
  dataSha256: string;
  source: LottoHistorySource;
}

export interface LottoHistory {
  metadata: LottoHistoryMetadata;
  draws: LottoDraw[];
}

export interface LottoConstraints {
  fixed: number[];
  excluded: number[];
}

export interface SumStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  lowerQuartile: number;
  upperQuartile: number;
}

export interface LottoStatistics {
  drawCount: number;
  frequency: number[];
  recentFrequency: number[];
  recentFrequencies: Record<10 | 30 | 50, number[]>;
  distributions: {
    odd: number[];
    low: number[];
    ranges: number[][];
    consecutive: number[];
    endings: number[];
    acValue: number[];
  };
  overdue: number[];
  sums: SumStatistics | null;
  draws: LottoDraw[];
}

export interface LottoGameAnalysis {
  odd: number;
  even: number;
  low: number;
  high: number;
  sum: number;
  consecutive: number;
  longestRun: number;
  ranges: number[];
  endings: number[];
  gaps: number[];
  acValue: number;
  historicalSimilarity: number;
  overdueNumbers: number[];
  recentAppearances: number;
}

export interface LottoGame {
  numbers: number[];
  score: number;
  analysis: LottoGameAnalysis;
  scoreBreakdown: Record<string, number>;
}

export interface RecommendationRequest {
  draws: LottoDraw[];
  constraints: LottoConstraints;
  retained?: number[][];
  avoid?: number[][];
  count?: number;
}
