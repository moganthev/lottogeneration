import type { LottoGame, RecommendationRequest } from '../types';

export function requestRecommendations(
  request: RecommendationRequest,
): Promise<LottoGame[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./recommendationWorker.ts', import.meta.url),
      { type: 'module' },
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('추천 시간이 초과되었습니다. 다시 시도해 주세요.'));
    }, 30_000);
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (
      event: MessageEvent<{ games?: LottoGame[]; error?: string }>,
    ) => {
      finish();
      if (event.data.games) resolve(event.data.games);
      else
        reject(
          new Error(event.data.error ?? '추천 결과를 불러오지 못했습니다.'),
        );
    };
    worker.onerror = () => {
      finish();
      reject(
        new Error(
          '추천 기능을 시작하지 못했습니다. 페이지를 새로고침해 주세요.',
        ),
      );
    };
    worker.postMessage(request);
  });
}
