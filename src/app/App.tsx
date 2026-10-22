import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { SiteHeader, About, SiteFooter } from './components/SiteLayout';
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
            로또 6/45
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
            연금복권720+
          </button>
        </div>

        {isLotto && (
          <div className="data-notice">
            <p>
              <strong>
                {history
                  ? `분석 데이터 ${history.metadata.firstDraw.toLocaleString('ko-KR')}회 ~ ${history.metadata.latestDraw.toLocaleString('ko-KR')}회`
                  : '당첨 데이터 확인 중'}
              </strong>{' '}
              {history &&
                `총 ${history.metadata.drawCount.toLocaleString('ko-KR')}개 회차 · 최근 추첨 ${history.metadata.latestDrawDate} · 갱신 ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(history.metadata.lastUpdated))}`}{' '}
              <a
                href="#about-data"
                onClick={() => {
                  const details = document.getElementById('about-data');
                  if (details instanceof HTMLDetailsElement)
                    details.open = true;
                }}
              >
                출처 보기
              </a>
            </p>
          </div>
        )}
        {isLotto && dataError && (
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
                <h2>{isLotto ? '오늘의 추천 번호' : '연금복권 추천 번호'}</h2>
                <p>
                  {isLotto
                    ? '한 번에 5게임을 추천합니다. 고정·제외 번호를 먼저 설정할 수 있습니다.'
                    : '각 조에서 여섯 자리 번호를 하나씩 추천합니다.'}
                </p>
              </div>
            </div>
            {isLotto && (
              <details className="mobile-settings">
                <summary>
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
              {busy && <LoaderCircle size={16} className="spin" />}
              <span>
                {busy
                  ? '추천 중…'
                  : isLotto
                    ? '5게임 추천받기'
                    : '연금복권 번호 추천'}
              </span>
            </button>
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
                번호 설정이 변경되었습니다. ‘5게임 추천받기’를 눌러 적용하세요.
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
                    <p>추천 번호가 없습니다.</p>
                    <p>‘5게임 추천받기’를 눌러 번호를 생성하세요.</p>
                  </div>
                )}
                {saved.generatedAt && (
                  <p className="saved-note">
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
            <p className="responsible-note">
              조합 평가점수는 당첨 확률이 아닙니다. 모든 유효한 로또 조합의 1등
              확률은 1 / 8,145,060으로 같습니다.
            </p>
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
            {isLotto && games.length > 0 && (
              <DiversityCard
                games={history ? saved.games : []}
                hasFixed={saved.appliedConstraints.fixed.length > 0}
              />
            )}
          </aside>
        </div>

        <About metadata={history?.metadata ?? null} />
      </main>
      <SiteFooter />
    </div>
  );
}
