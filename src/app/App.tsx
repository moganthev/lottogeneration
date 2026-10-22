import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleHelp,
  Clover,
  Info,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { Ball } from '../shared/components/Ball';
import { SiteHeader, Hero, About, SiteFooter } from './components/SiteLayout';
import { DiversityCard } from '../features/lotto/components/DiversityCard';
import {
  PensionResults,
  PensionMethodCard,
} from '../features/pensionLottery/components';
import { loadState, saveState } from '../shared/storage';
import { GameCard } from '../features/lotto/components/GameCard';
import { NumberPicker } from '../features/lotto/components/NumberPicker';
import { LocalLottoHistoryRepository } from '../features/lotto/services/historyRepository';
import { requestRecommendations } from '../features/lotto/services/recommendationService';
import { analyzeHistory } from '../features/lotto/algorithms/statistics';
import { calculateCombinationScore } from '../features/lotto/algorithms/scoring';
import type { LottoHistory } from '../features/lotto/types';
import { recommendPension } from '../features/pensionLottery/algorithm';

export default function App() {
  const [saved, setSaved] = useState(loadState);
  const [history, setHistory] = useState<LottoHistory | null>(null);
  const [dataError, setDataError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    void new LocalLottoHistoryRepository()
      .getHistory()
      .then(setHistory)
      .catch((e: unknown) =>
        setDataError(
          `당첨 데이터 오류: ${e instanceof Error ? e.message : '데이터를 읽지 못했습니다.'} 로또 추천이 비활성화되었습니다.`,
        ),
      );
  }, []);
  useEffect(() => {
    saveState(saved);
  }, [saved]);
  useEffect(() => {
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  const draws = history?.draws;
  const statistics = useMemo(() => analyzeHistory(draws ?? []), [draws]);
  const games = useMemo(
    () =>
      (history ? saved.games : []).map((numbers) =>
        calculateCombinationScore(numbers, statistics),
      ),
    [saved.games, statistics, history],
  );
  const conditionsChanged =
    JSON.stringify(saved.constraints) !==
    JSON.stringify(saved.appliedConstraints);
  const isLotto = saved.tab === 'lotto';

  async function generate(index?: number) {
    if (!draws || busy) return;
    setBusy(true);
    setError('');
    setStatus(
      index === undefined
        ? '5게임을 분석하고 있어요.'
        : `GAME ${index + 1}을 다시 분석하고 있어요.`,
    );
    try {
      const retained =
        index === undefined ? [] : saved.games.filter((_, i) => i !== index);
      const result = await requestRecommendations({
        draws,
        constraints: saved.constraints,
        retained,
        count: index === undefined ? 5 : 1,
        avoid: index === undefined ? [] : [saved.games[index]],
      });
      const nextGames =
        index === undefined
          ? result.map((game) => game.numbers)
          : saved.games.map((game, i) =>
              i === index ? result[0].numbers : game,
            );
      setSaved((current) => ({
        ...current,
        games: nextGames,
        appliedConstraints: current.constraints,
        generatedAt: new Date().toISOString(),
      }));
      setStatus(
        index === undefined
          ? '새로운 5게임을 추천했어요.'
          : `GAME ${index + 1}을 새 번호로 바꿨어요. 나머지 4게임은 유지됩니다.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '추천에 실패했습니다. 다시 시도해 주세요.',
      );
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function generatePension() {
    try {
      setError('');
      const pension = recommendPension();
      setSaved((current) => ({ ...current, pension }));
      setStatus('연금복권 5개 번호를 추천했어요.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader online={online} />

      <main>
        <Hero />

        <div
          className="lottery-tabs"
          role="tablist"
          aria-label="복권 종류"
          onKeyDown={(event) => {
            if (
              !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) ||
              busy
            )
              return;
            event.preventDefault();
            const id =
              event.key === 'Home'
                ? 'lotto-tab'
                : event.key === 'End'
                  ? 'pension-tab'
                  : isLotto
                    ? 'pension-tab'
                    : 'lotto-tab';
            const target = document.getElementById(id);
            target?.focus();
            target?.click();
          }}
        >
          <button
            id="lotto-tab"
            role="tab"
            aria-selected={isLotto}
            tabIndex={isLotto ? 0 : -1}
            aria-controls="lottery-panel"
            className={isLotto ? 'active' : ''}
            disabled={busy}
            onClick={() => {
              setSaved((s) => ({ ...s, tab: 'lotto' }));
              setError('');
              setStatus('');
            }}
          >
            <Clover size={18} />
            로또 6/45<span>LOTTO</span>
          </button>
          <button
            id="pension-tab"
            role="tab"
            aria-selected={!isLotto}
            tabIndex={isLotto ? -1 : 0}
            aria-controls="lottery-panel"
            className={!isLotto ? 'active' : ''}
            disabled={busy}
            onClick={() => {
              setSaved((s) => ({ ...s, tab: 'pension' }));
              setError('');
              setStatus('');
            }}
          >
            <Ticket size={18} />
            연금복권<span>720+</span>
          </button>
        </div>

        <div className="data-notice">
          <Info size={16} />
          <p>
            <strong>
              {history
                ? `분석 데이터 ${history.metadata.firstDraw.toLocaleString('ko-KR')}회 ~ ${history.metadata.latestDraw.toLocaleString('ko-KR')}회`
                : '당첨 데이터를 확인하고 있어요.'}
            </strong>{' '}
            {history &&
              `총 ${history.metadata.drawCount.toLocaleString('ko-KR')}개 회차 · 최근 추첨 ${history.metadata.latestDrawDate} · 갱신 ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(history.metadata.lastUpdated))}`}{' '}
            <a href="#about-data">
              데이터 안내 <ArrowDown size={11} />
            </a>
          </p>
        </div>
        {dataError && (
          <p className="error-notice" role="alert">
            {dataError}
          </p>
        )}
        <div
          className="workspace"
          id="lottery-panel"
          role="tabpanel"
          aria-labelledby={isLotto ? 'lotto-tab' : 'pension-tab'}
        >
          <section className="recommendations" aria-busy={busy}>
            <div className="section-top">
              <div>
                <p className="section-eyebrow">YOUR DAILY PICKS</p>
                <h2>
                  {isLotto ? '오늘의 추천 번호' : '조금 다른, 다섯 가지 선택'}{' '}
                  <span>5 GAMES</span>
                </h2>
                <p>
                  {isLotto
                    ? '조합의 균형을 살피고, 게임 사이의 겹침은 줄였어요.'
                    : '자리별 숫자와 조를 다양하게 골라보세요.'}
                </p>
              </div>
            </div>
            {isLotto && (
              <details className="mobile-settings">
                <summary>
                  <SlidersHorizontal size={15} />
                  <span>번호 고정·제외 설정</span>
                  <small>
                    고정 {saved.constraints.fixed.length} · 제외{' '}
                    {saved.constraints.excluded.length}
                  </small>
                </summary>
                <NumberPicker
                  id="mobile-picker-title"
                  constraints={saved.constraints}
                  disabled={busy}
                  onChange={(constraints) =>
                    setSaved((s) => ({ ...s, constraints }))
                  }
                />
              </details>
            )}
            <button
              className="primary-button generate-button"
              disabled={busy || (isLotto && !draws)}
              onClick={() => (isLotto ? void generate() : generatePension())}
            >
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <Sparkles size={18} />
              )}
              <span>
                {busy
                  ? '균형 잡힌 조합을 찾고 있어요…'
                  : isLotto
                    ? '5게임 추천받기'
                    : '연금복권 번호 추천'}
              </span>
              {!busy && <ArrowRight size={18} />}
            </button>
            <p className="generation-note">
              {isLotto
                ? '5,000개 후보 분석 · 높은 점수와 다양한 번호를 함께 고려해요'
                : '1~5조 · 000000~999999 · 반복과 자리 중복을 함께 살펴요'}
            </p>
            {error && (
              <p className="error-notice" role="alert">
                {error}
              </p>
            )}
            <p className="sr-only" role="status" aria-live="polite">
              {status}
            </p>
            {isLotto && conditionsChanged && games.length > 0 && (
              <p className="pending-notice">
                <Info size={15} />
                번호 설정이 바뀌었어요. ‘5게임 추천받기’로 전체에 적용해 주세요.
              </p>
            )}
            {isLotto ? (
              <>
                {games.length ? (
                  <div className={`game-list ${busy ? 'is-busy' : ''}`}>
                    {games.map((game, index) => (
                      <GameCard
                        key={`${index}-${game.numbers.join('-')}`}
                        game={game}
                        games={games}
                        index={index}
                        fixed={saved.appliedConstraints.fixed}
                        busy={busy || conditionsChanged}
                        onReroll={() => void generate(index)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Clover size={32} />
                    </span>
                    <h3>다섯 게임에 담을 오늘의 균형</h3>
                    <p>
                      위의 추천 버튼을 눌러 시작해 보세요.
                      <br />
                      원하는 번호가 있다면 먼저 고정할 수 있어요.
                    </p>
                    <div className="empty-balls" aria-hidden="true">
                      {[7, 16, 23, 34, 42].map((n) => (
                        <Ball key={n} number={n} />
                      ))}
                    </div>
                  </div>
                )}
                {saved.generatedAt && (
                  <p className="saved-note">
                    <Check size={12} />
                    마지막 추천{' '}
                    {new Intl.DateTimeFormat('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(saved.generatedAt))}{' '}
                    · 기기 저장 허용 시 최근 결과 유지
                  </p>
                )}
              </>
            ) : (
              <>
                <PensionResults tickets={saved.pension} />
              </>
            )}
            <div className="responsible-note">
              <ShieldCheck size={20} />
              <p>
                <strong>분석은 선택의 참고일 뿐이에요.</strong>
                <br />
                모든 로또 6개 번호 조합의 당첨 확률은 동일합니다.
                <br />
                1등 확률은 1 / 8,145,060입니다.
                <br />
                조합 평가점수는 실제 당첨 확률을 의미하지 않습니다.
              </p>
            </div>
          </section>

          <aside className="sidebar">
            {isLotto ? (
              <div className="desktop-picker">
                <NumberPicker
                  constraints={saved.constraints}
                  disabled={busy}
                  onChange={(constraints) =>
                    setSaved((s) => ({ ...s, constraints }))
                  }
                />
              </div>
            ) : (
              <PensionMethodCard />
            )}
            {isLotto && (
              <DiversityCard
                games={history ? saved.games : []}
                hasFixed={saved.appliedConstraints.fixed.length > 0}
              />
            )}
            <section className="how-card">
              <span className="how-icon">
                <CircleHelp size={18} />
              </span>
              <h3>좋은 점수는 무슨 뜻인가요?</h3>
              <p>
                홀짝, 번호합, 구간 분포 등을 살펴
                <br />
                조합이 균형 잡힌 정도를 표시해요.
              </p>
              <a href="#about-algorithm">
                추천 방식 알아보기 <ArrowRight size={13} />
              </a>
            </section>
          </aside>
        </div>

        <About metadata={history?.metadata ?? null} />
      </main>
      <SiteFooter />
    </div>
  );
}
