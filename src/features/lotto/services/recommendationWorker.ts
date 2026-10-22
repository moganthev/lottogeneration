import type { RecommendationRequest } from '../types';
import { recommendGames } from '../algorithms/recommend';

self.onmessage = (event: MessageEvent<RecommendationRequest>) => {
  try {
    self.postMessage({ games: recommendGames(event.data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : '추천 중 오류가 발생했습니다.',
    });
  }
};
