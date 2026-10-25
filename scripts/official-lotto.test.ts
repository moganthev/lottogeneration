import { describe, expect, it, vi } from 'vitest';
import bundled from '../src/features/lotto/data/lotto-history.json';
import {
  createHistory,
  validateLottoDraw,
} from '../src/features/lotto/services/historyValidation';
import type { LottoDraw } from '../src/features/lotto/types';
import {
  fetchOfficialUpdate,
  latestPossibleDraw,
  OFFICIAL_RECENT_URL,
  parseOfficialDraws,
} from './official-lotto';

const draws = bundled.draws.slice(0, 4).map((draw) => validateLottoDraw(draw));
const now = new Date('2002-12-21T12:00:00Z');
const current = () =>
  createHistory(
    draws.slice(0, 2),
    bundled.metadata.source,
    '2002-12-14T12:00:00Z',
  );
const envelope = (rows: LottoDraw[]) => ({
  resultCode: null,
  data: {
    list: [...rows].reverse().map((draw) => ({
      ltEpsd: draw.drawNo,
      ltRflYmd: draw.drawDate.replaceAll('-', ''),
      tm1WnNo: draw.numbers[0],
      tm2WnNo: draw.numbers[1],
      tm3WnNo: draw.numbers[2],
      tm4WnNo: draw.numbers[3],
      tm5WnNo: draw.numbers[4],
      tm6WnNo: draw.numbers[5],
      bnsWnNo: draw.bonus,
      rnk1WnAmt: 1000000,
    })),
  },
});
const jsonResponse = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  });
const officialFetch = (primary: LottoDraw[], recent = primary) =>
  vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      jsonResponse(
        envelope(
          String(url).startsWith(OFFICIAL_RECENT_URL) ? recent : primary,
        ),
      ),
    );

describe('official weekly draw synchronization', () => {
  it('uses the Korean Saturday calendar boundary regardless of runner timezone', () => {
    expect(latestPossibleDraw(new Date('2002-12-13T14:59:59Z'))).toBe(1);
    expect(latestPossibleDraw(new Date('2002-12-13T15:00:00Z'))).toBe(2);
    expect(latestPossibleDraw(now)).toBe(3);
  });
  it('normalizes official rows and keeps only draw facts', () => {
    expect(parseOfficialDraws(envelope(draws))).toEqual(draws);
  });
  it.each([
    null,
    {},
    { resultCode: 'ERROR', data: { list: [] } },
    { resultCode: null, data: { list: [] } },
    { resultCode: null, data: {} },
  ])('rejects missing or unsuccessful official data: %j', (input) => {
    expect(() => parseOfficialDraws(input)).toThrow();
  });
  it('rejects invalid numbers, date formats and gaps instead of coercing fields', () => {
    const response = envelope(draws.slice(0, 3));
    expect(() =>
      parseOfficialDraws({
        ...response,
        data: { list: [{ ...response.data.list[0], tm1WnNo: '27' }] },
      }),
    ).toThrow('본번호');
    expect(() =>
      parseOfficialDraws({
        ...response,
        data: { list: [{ ...response.data.list[0], ltRflYmd: '2002-12-21' }] },
      }),
    ).toThrow('날짜 형식');
    expect(() => parseOfficialDraws(envelope([draws[0], draws[2]]))).toThrow(
      '누락',
    );
  });
  it('accepts a new draw only after both official routes agree', async () => {
    const history = await current();
    const fetcher = officialFetch(draws.slice(0, 3), draws.slice(1, 3));
    const update = await fetchOfficialUpdate(history, { now, fetcher });
    expect(update?.draws).toEqual(draws.slice(0, 3));
    expect(update?.sourceUrl).toContain('srchStrLtEpsd=1&srchEndLtEpsd=3');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error' });
    expect(fetcher.mock.calls[1][0]).toBe(
      `${OFFICIAL_RECENT_URL}?srchDir=center&srchLtEpsd=3`,
    );
  });
  it('keeps an unpublished or already-current draw unchanged without another fetch', async () => {
    const history = await current();
    const original = structuredClone(history);
    const fetcher = officialFetch(draws.slice(0, 2));
    await expect(
      fetchOfficialUpdate(history, { now, fetcher }),
    ).resolves.toBeNull();
    expect(history).toEqual(original);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['truncated', draws.slice(0, 1)],
    ['missing first draw', draws.slice(1, 3)],
    ['future draw', draws],
    [
      'incorrect date',
      [draws[0], draws[1], { ...draws[2], drawDate: '2002-12-20' }],
    ],
    ['modified history', [{ ...draws[0], bonus: 17 }, draws[1], draws[2]]],
  ])('refuses %s without changing existing history', async (_name, rows) => {
    const history = await current();
    const original = structuredClone(history);
    await expect(
      fetchOfficialUpdate(history, {
        now,
        fetcher: officialFetch(rows),
      }),
    ).rejects.toThrow();
    expect(history).toEqual(original);
  });
  it('rejects different latest rounds across the two official routes', async () => {
    await expect(
      fetchOfficialUpdate(await current(), {
        now,
        fetcher: officialFetch(draws.slice(0, 3), draws.slice(0, 2)),
      }),
    ).rejects.toThrow('최신 회차가 서로 다릅니다');
  });
  it('rejects conflicting bonus numbers across the two official routes', async () => {
    await expect(
      fetchOfficialUpdate(await current(), {
        now,
        fetcher: officialFetch(draws.slice(0, 3), [{ ...draws[2], bonus: 1 }]),
      }),
    ).rejects.toThrow('두 공식 조회 경로');
  });
  it.each([
    ['HTTP error', () => new Response('Denied', { status: 403 })],
    [
      'HTML challenge',
      () =>
        new Response('<html>Not results</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    ],
    [
      'invalid JSON',
      () =>
        new Response('{broken', {
          headers: { 'Content-Type': 'application/json' },
        }),
    ],
  ])('does not replace history on %s', async (_name, response) => {
    const history = await current();
    const original = structuredClone(history);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response());
    await expect(
      fetchOfficialUpdate(history, { now, fetcher }),
    ).rejects.toThrow();
    expect(history).toEqual(original);
  });
  it('fails on network errors without changing existing history', async () => {
    const history = await current();
    const original = structuredClone(history);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('network timeout'));
    await expect(
      fetchOfficialUpdate(history, { now, fetcher }),
    ).rejects.toThrow('network timeout');
    expect(history).toEqual(original);
  });
});
