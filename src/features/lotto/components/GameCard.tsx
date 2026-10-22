import { Ball } from '../../../shared/components/Ball';
import { calculateSimilarity } from '../algorithms/statistics';
import type { LottoGame } from '../types';

export function GameCard({
  game,
  index,
  games,
  fixed,
  busy,
  onReroll,
}: {
  game: LottoGame;
  index: number;
  games: LottoGame[];
  fixed: number[];
  busy: boolean;
  onReroll(): void;
}) {
  const a = game.analysis;
  const overlap = Math.max(
    0,
    ...games
      .filter((_, i) => i !== index)
      .map((other) => calculateSimilarity(game.numbers, other.numbers)),
  );
  return (
    <article className="game-card">
      <div className="game-topline">
        <span className="game-label">
          {String(index + 1).padStart(2, '0')}번 게임
        </span>
        <span className="score-label">
          조합 평가점수 <strong>{game.score}</strong>
          <span>/ 100</span>
        </span>
      </div>
      <div className="game-main">
        <div
          className="balls"
          aria-label={`게임 ${index + 1} 번호 ${game.numbers.join(', ')}`}
        >
          {game.numbers.map((n) => (
            <Ball key={n} number={n} fixed={fixed.includes(n)} />
          ))}
        </div>
        <button
          className="reroll-button"
          disabled={busy}
          onClick={onReroll}
          aria-label={`GAME ${index + 1} 다시 추천`}
        >
          <span>다시 추천</span>
        </button>
      </div>
      <details className="game-details">
        <summary>
          <span>분석 보기</span>
        </summary>
        <dl className="analysis-grid">
          <div>
            <dt>홀수 : 짝수</dt>
            <dd>
              {a.odd} : {a.even}
            </dd>
          </div>
          <div>
            <dt>저번호 : 고번호</dt>
            <dd>
              {a.low} : {a.high}
            </dd>
          </div>
          <div>
            <dt>번호 합계</dt>
            <dd>{a.sum}</dd>
          </div>
          <div>
            <dt>연속번호</dt>
            <dd>{a.consecutive}쌍</dd>
          </div>
          <div>
            <dt>구간 분포</dt>
            <dd>{a.ranges.join(' / ')}</dd>
          </div>
          <div>
            <dt>AC Value</dt>
            <dd>{a.acValue}</dd>
          </div>
          <div>
            <dt>다른 게임 최대 중복</dt>
            <dd>{overlap}개</dd>
          </div>
          <div>
            <dt>과거 당첨 조합 최대 일치</dt>
            <dd>{a.historicalSimilarity}개</dd>
          </div>
          <div>
            <dt>최근 30회 출현 합계</dt>
            <dd>{a.recentAppearances}회</dd>
          </div>
          <div>
            <dt>10회 이상 미출현 번호</dt>
            <dd>{a.overdueNumbers.join(', ') || '없음'}</dd>
          </div>
          <div>
            <dt>번호 간격</dt>
            <dd>{a.gaps.join(' · ')}</dd>
          </div>
          <div>
            <dt>최대 같은 끝수</dt>
            <dd>{Math.max(...a.endings)}개</dd>
          </div>
        </dl>
        <p className="analysis-caption">
          당첨 이력에 기반한 참고 지표입니다. 조합 평가점수는 실제 당첨 확률이
          아닙니다.
        </p>
      </details>
      {fixed.length > 0 && (
        <span className="sr-only">고정 번호 {fixed.join(', ')}</span>
      )}
    </article>
  );
}
