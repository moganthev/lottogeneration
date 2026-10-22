import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  Clover,
  Database,
  Layers3,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
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
        <span className="brand-icon">
          <Clover size={24} />
        </span>
        <span>
          Lotto<span className="brand-light">Generation</span>
          <small>작은 분석, 다양한 선택</small>
        </span>
      </a>
      <div className="header-actions">
        <span className="local-badge">
          <i />
          {online ? (
            '기기 안에서 안전하게'
          ) : (
            <>
              <WifiOff size={12} /> 오프라인 모드
            </>
          )}
        </span>
        <PwaNotice />
      </div>
    </header>
  );
}
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span /> A LITTLE BALANCE, A LITTLE POSSIBILITY
        </p>
        <h1 id="hero-title">
          오늘의 숫자,
          <br />
          <span>균형 있게</span> 골라볼까요?
        </h1>
        <p className="hero-description">
          번호의 분포를 살피고, 서로 다른 가능성을 담아요.
          <br />
          통계와 다양성으로 고르는 나만의 다섯 게임.
        </p>
        <div className="hero-tags">
          <span>
            <ChartNoAxesCombined size={14} /> 통계 기반 분석
          </span>
          <span>
            <Layers3 size={14} /> 5게임 다양성
          </span>
          <span>
            <ShieldCheck size={14} /> 개인정보 수집 없음
          </span>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="art-spark spark-one">✦</div>
        <div className="art-spark spark-two">✦</div>
        <div className="art-ball art-ball-yellow">7</div>
        <div className="art-ball art-ball-green">21</div>
        <div className="art-ball art-ball-blue">36</div>
        <span className="art-label">
          <Check size={13} /> 오늘도, 가볍게 즐겨요
        </span>
      </div>
    </section>
  );
}
export function About({ metadata }: { metadata: LottoHistoryMetadata | null }) {
  return (
    <>
      <section className="about-section" id="about-algorithm">
        <div>
          <p className="section-eyebrow">BEHIND THE NUMBERS</p>
          <h2>예측 대신, 균형을 생각합니다.</h2>
          <p>
            과거 당첨 데이터와 번호 분포를 분석하여 통계적으로 균형 잡힌 번호
            조합을 추천합니다. 분석 점수는 실제 당첨 확률을 의미하지 않습니다.
          </p>
        </div>
        <div className="pipeline">
          <span>
            <Database size={19} />
            <strong>당첨 이력 통계</strong>
            <small>빈도 · 합계 · 분포</small>
          </span>
          <ArrowRight size={16} />
          <span>
            <ChartNoAxesCombined size={19} />
            <strong>후보 평가</strong>
            <small>5,000개 조합 분석</small>
          </span>
          <ArrowRight size={16} />
          <span>
            <Layers3 size={19} />
            <strong>다양성 선택</strong>
            <small>겹침을 줄인 5게임</small>
          </span>
        </div>
      </section>
      <section id="about-data" className="data-footer">
        <Database size={16} />
        <p>
          {metadata ? (
            <>
              <strong>{metadata.source.name}</strong> ·{' '}
              {metadata.firstDraw.toLocaleString('ko-KR')}회 ~{' '}
              {metadata.latestDraw.toLocaleString('ko-KR')}회, 총{' '}
              {metadata.drawCount.toLocaleString('ko-KR')}개 회차. 최근 추첨{' '}
              {metadata.latestDrawDate}.{' '}
              <a href={metadata.source.url} target="_blank" rel="noreferrer">
                원본 확인 ↗
              </a>{' '}
              · 정적 스냅샷으로, 새 회차는 데이터 갱신 후 반영됩니다.
            </>
          ) : (
            <strong>
              검증된 당첨 데이터가 없으면 로또 추천을 사용할 수 없습니다.
            </strong>
          )}{' '}
          모든 계산은 브라우저에서 수행되며 추천 시 외부 사이트를 호출하지
          않습니다.
        </p>
      </section>
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        <Clover size={16} /> LottoGeneration
      </span>
      <p>숫자는 가볍게, 선택은 책임 있게. 만 19세 이상 이용하세요.</p>
      <span className="footer-note">Made for a little balance.</span>
    </footer>
  );
}
