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
        <h3>5게임 중복 현황</h3>
      </div>
      <div className="diversity-main">
        <strong>
          {diversity.uniqueCount}
          <small> / 30</small>
        </strong>
        <span>전체 고유 번호</span>
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
        <p className="picker-note">고정 번호는 모든 게임에 포함됩니다.</p>
      )}
    </section>
  );
}
