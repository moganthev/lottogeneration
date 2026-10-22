import { PwaNotice } from '../../shared/components/PwaNotice';
import type { LottoHistoryMetadata } from '../../features/lotto/types';

export function SiteHeader({ online }: { online: boolean }) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        aria-label="LottoGeneration 홈"
      >
        <h1>LottoGeneration</h1>
        <span>로또 · 연금복권 번호 도구</span>
      </a>
      <div className="header-actions">
        <a
          className="official-link"
          href="https://www.dhlottery.co.kr/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="동행복권 바로가기 (새 탭)"
        >
          동행복권 바로가기
        </a>
        {!online && <span className="offline-label">오프라인</span>}
        <PwaNotice />
      </div>
    </header>
  );
}

export function About({ metadata }: { metadata: LottoHistoryMetadata | null }) {
  return (
    <details className="about-section" id="about-data">
      <summary>추천 기준 · 데이터 출처</summary>
      <div className="about-content">
        <p>
          로또는 과거 당첨 이력의 번호 빈도, 홀짝, 합계, 구간 분포 등을 기준으로
          후보를 평가한 뒤 게임 간 번호 중복을 줄여 5게임을 고릅니다. 평가점수는
          당첨 확률을 뜻하지 않습니다.
        </p>
        {metadata ? (
          <p>
            출처:{' '}
            <a href={metadata.source.url} target="_blank" rel="noreferrer">
              {metadata.source.name}
            </a>
            <br />
            {metadata.firstDraw.toLocaleString('ko-KR')}회 ~{' '}
            {metadata.latestDraw.toLocaleString('ko-KR')}회 · 총{' '}
            {metadata.drawCount.toLocaleString('ko-KR')}개 회차 · 최근 추첨{' '}
            {metadata.latestDrawDate}
            <br />새 회차는 데이터 갱신 후 반영됩니다.
          </p>
        ) : (
          <p>검증된 당첨 데이터가 없으면 로또 추천을 사용할 수 없습니다.</p>
        )}
      </div>
    </details>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>LottoGeneration</span>
      <span>만 19세 이상 이용</span>
    </footer>
  );
}
