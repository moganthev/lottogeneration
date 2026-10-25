import {
  validateLottoDraw,
  validateLottoHistory,
} from '../src/features/lotto/services/historyValidation';
import type { LottoDraw, LottoHistory } from '../src/features/lotto/types';

export const OFFICIAL_RESULT_PAGE = 'https://www.dhlottery.co.kr/lt645/result';
export const OFFICIAL_RECENT_URL =
  'https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do';
const FIRST_DRAW = Date.parse('2002-12-07T00:00:00Z');
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function latestPossibleDraw(now: Date): number {
  // Korea uses UTC+9. Only the calendar date is used; publication is confirmed
  // by the official response, never inferred from the draw schedule.
  const date = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return Math.max(
    1,
    Math.floor((Date.parse(`${date}T00:00:00Z`) - FIRST_DRAW) / WEEK) + 1,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('동행복권 응답에 객체가 필요합니다.');
  return value as Record<string, unknown>;
}

export function parseOfficialDraws(value: unknown): LottoDraw[] {
  const response = record(value);
  if (response.resultCode != null)
    throw new Error('동행복권 조회가 정상적으로 완료되지 않았습니다.');
  const rows = record(response.data).list;
  if (!Array.isArray(rows))
    throw new Error('동행복권 응답에 회차 목록이 없습니다.');
  return validateLottoHistory(
    rows.map((value, i) => {
      const row = record(value);
      if (typeof row.ltRflYmd !== 'string' || !/^\d{8}$/.test(row.ltRflYmd))
        throw new Error(`공식 응답 ${i}: 추첨 날짜 형식이 올바르지 않습니다.`);
      const date = row.ltRflYmd;
      return validateLottoDraw({
        drawNo: row.ltEpsd,
        drawDate: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        numbers: [
          row.tm1WnNo,
          row.tm2WnNo,
          row.tm3WnNo,
          row.tm4WnNo,
          row.tm5WnNo,
          row.tm6WnNo,
        ],
        bonus: row.bnsWnNo,
      });
    }),
  );
}

export interface OfficialUpdate {
  draws: LottoDraw[];
  sourceUrl: string;
  sourceText: string;
  confirmationUrl: string;
  confirmationText: string;
}

export async function fetchOfficialUpdate(
  current: LottoHistory,
  {
    now = new Date(),
    fetcher = fetch,
  }: { now?: Date; fetcher?: typeof fetch } = {},
): Promise<OfficialUpdate | null> {
  const possible = latestPossibleDraw(now);
  if (possible < current.metadata.latestDraw)
    throw new Error('현재 시각이 저장된 최신 추첨일보다 이전입니다.');
  const sourceUrl = new URL(
    'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do',
  );
  sourceUrl.searchParams.set('srchStrLtEpsd', '1');
  sourceUrl.searchParams.set('srchEndLtEpsd', String(possible));

  const load = async (url: string) => {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok)
      throw new Error(`동행복권 조회 실패: HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('공식 조회가 JSON 대신 다른 페이지를 반환했습니다.');
    const text = await response.text();
    const json: unknown = JSON.parse(text);
    return { text, draws: parseOfficialDraws(json) };
  };

  const primary = await load(sourceUrl.href);
  const latest = primary.draws.at(-1)!;
  if (
    primary.draws[0].drawNo !== 1 ||
    latest.drawNo < current.metadata.latestDraw
  )
    throw new Error('공식 응답이 기존 이력을 축소합니다. 갱신하지 않습니다.');
  if (latest.drawNo > possible)
    throw new Error('공식 응답에 아직 추첨할 수 없는 미래 회차가 있습니다.');
  for (const draw of primary.draws) {
    const expectedDate = new Date(FIRST_DRAW + (draw.drawNo - 1) * WEEK)
      .toISOString()
      .slice(0, 10);
    if (draw.drawDate !== expectedDate)
      throw new Error(`${draw.drawNo}회 추첨일이 회차와 일치하지 않습니다.`);
  }
  for (let i = 0; i < current.draws.length; i++) {
    if (JSON.stringify(current.draws[i]) !== JSON.stringify(primary.draws[i]))
      throw new Error(
        `${current.draws[i].drawNo}회가 기존 공식 이력과 다릅니다. 갱신하지 않습니다.`,
      );
  }
  if (latest.drawNo === current.metadata.latestDraw) return null;

  // Cross-check the latest published results through the official recent-results
  // endpoint before replacing the full snapshot.
  const confirmationUrl = new URL(OFFICIAL_RECENT_URL);
  confirmationUrl.searchParams.set('srchDir', 'center');
  confirmationUrl.searchParams.set('srchLtEpsd', String(latest.drawNo));
  const confirmation = await load(confirmationUrl.href);
  if (confirmation.draws.at(-1)!.drawNo !== latest.drawNo)
    throw new Error(
      '공식 조회 경로의 최신 회차가 서로 다릅니다. 나중에 다시 확인합니다.',
    );
  for (const draw of confirmation.draws) {
    if (JSON.stringify(primary.draws[draw.drawNo - 1]) !== JSON.stringify(draw))
      throw new Error(
        `${draw.drawNo}회가 두 공식 조회 경로에서 일치하지 않습니다.`,
      );
  }
  return {
    draws: primary.draws,
    sourceUrl: sourceUrl.href,
    sourceText: primary.text,
    confirmationUrl: confirmationUrl.href,
    confirmationText: confirmation.text,
  };
}
