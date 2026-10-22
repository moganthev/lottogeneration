import bundled from '../data/lotto-history.json';
import {
  validateHistoryDocument,
  validateLottoHistory,
} from './historyValidation';
import type { LottoDraw, LottoHistory } from '../types';

export interface LottoHistoryRepository {
  getDraws(): Promise<LottoDraw[]>;
  getHistory(): Promise<LottoHistory>;
}

export const validateDraws = validateLottoHistory;

export class LocalLottoHistoryRepository implements LottoHistoryRepository {
  constructor(private readonly input: unknown = bundled) {}
  async getHistory() {
    return validateHistoryDocument(this.input);
  }
  async getDraws() {
    return (await this.getHistory()).draws;
  }
}
