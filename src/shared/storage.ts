import {
  isLottoNumbers,
  validateConstraints,
} from '../features/lotto/algorithms/recommend';
import type { LottoConstraints } from '../features/lotto/types';
import { isPensionTicket } from '../features/pensionLottery/algorithm';
import type { PensionTicket } from '../features/pensionLottery/types';

const STORAGE_KEY = 'lottogeneration:v1';

export interface SavedState {
  tab: 'lotto' | 'pension';
  constraints: LottoConstraints;
  appliedConstraints: LottoConstraints;
  games: number[][];
  pension: PensionTicket[];
  generatedAt: string | null;
}

export const emptyState: SavedState = {
  tab: 'lotto',
  constraints: { fixed: [], excluded: [] },
  appliedConstraints: { fixed: [], excluded: [] },
  games: [],
  pension: [],
  generatedAt: null,
};

export function loadState(): SavedState {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    if (!raw || typeof raw !== 'object') return emptyState;
    const saved = raw as Partial<SavedState>;
    if (
      (saved.tab !== 'lotto' && saved.tab !== 'pension') ||
      !saved.constraints ||
      !Array.isArray(saved.constraints.fixed) ||
      !Array.isArray(saved.constraints.excluded) ||
      !Array.isArray(saved.games) ||
      ![0, 5].includes(saved.games.length) ||
      !saved.games.every(isLottoNumbers) ||
      new Set(
        saved.games.map((game) => [...game].sort((a, b) => a - b).join(',')),
      ).size !== saved.games.length ||
      !Array.isArray(saved.pension) ||
      ![0, 5].includes(saved.pension.length) ||
      !saved.pension.every(isPensionTicket) ||
      (saved.generatedAt !== null &&
        (typeof saved.generatedAt !== 'string' ||
          !Number.isFinite(Date.parse(saved.generatedAt))))
    )
      return emptyState;
    validateConstraints(saved.constraints);
    const appliedConstraints = saved.appliedConstraints ?? saved.constraints;
    if (
      !Array.isArray(appliedConstraints.fixed) ||
      !Array.isArray(appliedConstraints.excluded)
    )
      return emptyState;
    validateConstraints(appliedConstraints);
    if (
      saved.games.some(
        (game) =>
          appliedConstraints.fixed.some((n) => !game.includes(n)) ||
          appliedConstraints.excluded.some((n) => game.includes(n)),
      )
    )
      return emptyState;
    return {
      tab: saved.tab,
      constraints: saved.constraints,
      appliedConstraints,
      games: saved.games,
      pension: saved.pension,
      generatedAt: saved.generatedAt ?? null,
    };
  } catch {
    return emptyState;
  }
}

export function saveState(state: SavedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
