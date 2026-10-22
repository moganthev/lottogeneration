import { Layers3 } from 'lucide-react';
import { analyzeDiversity } from '../algorithms/statistics';

export function DiversityCard({
  games,
  hasFixed,
}: {
  games: number[][];
  hasFixed: boolean;
}) {
  const diversity = analyzeDiversity(games);
  return (
    <section className="side-card diversity-card">
      <div className="side-heading">
        <h3>다섯 게임의 다양성</h3>
        <Layers3 size={18} />
      </div>
      <p className="side-description">서로 다른 번호를 얼마나 담았을까요?</p>
      <div className="diversity-main">
        <strong>
          {diversity.uniqueCount}
          <small> / 30</small>
        </strong>
        <span>전체 고유 번호</span>
      </div>
      <div className="coverage-track">
        <span style={{ width: `${(diversity.uniqueCount / 30) * 100}%` }} />
      </div>
      <dl className="diversity-stats">
        <div>
          <dt>게임 간 평균 중복</dt>
          <dd>{diversity.averageOverlap.toFixed(1)}개</dd>
        </div>
        <div>
          <dt>한 번호 최대 사용</dt>
          <dd>{diversity.maxRepetition}회</dd>
        </div>
      </dl>
      {hasFixed && (
        <p className="picker-note">
          고정 번호는 모든 게임에 포함되므로 중복이 늘어날 수 있어요.
        </p>
      )}
    </section>
  );
}
