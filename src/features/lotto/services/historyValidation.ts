import { isLottoNumbers } from '../algorithms/constraints';
import type {
  LottoDraw,
  LottoHistory,
  LottoHistoryMetadata,
  LottoHistorySource,
} from '../types';

const fail = (path: string, reason: string): never => {
  throw new Error(`${path}: ${reason}`);
};
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(path, '객체가 필요합니다.');
  return value as Record<string, unknown>;
}

export function isDrawDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function validateLottoDraw(value: unknown, path = 'draw'): LottoDraw {
  const draw = record(value, path);
  if (
    typeof draw.drawNo !== 'number' ||
    !Number.isSafeInteger(draw.drawNo) ||
    draw.drawNo < 1
  )
    return fail(`${path}.drawNo`, '양의 정수 회차가 필요합니다.');
  if (!isDrawDate(draw.drawDate))
    return fail(`${path}.drawDate`, '실제 날짜인 YYYY-MM-DD가 필요합니다.');
  if (!isLottoNumbers(draw.numbers))
    return fail(
      `${path}.numbers`,
      '1~45 사이 중복 없는 본번호 6개가 필요합니다.',
    );
  if (
    typeof draw.bonus !== 'number' ||
    !Number.isInteger(draw.bonus) ||
    draw.bonus < 1 ||
    draw.bonus > 45 ||
    draw.numbers.includes(draw.bonus)
  )
    return fail(
      `${path}.bonus`,
      '본번호와 겹치지 않는 1~45 정수가 필요합니다.',
    );
  const numbers = [...draw.numbers].sort((a, b) => a - b);
  if (!isLottoNumbers(numbers))
    return fail(`${path}.numbers`, '본번호가 유효하지 않습니다.');
  return {
    drawNo: draw.drawNo,
    drawDate: draw.drawDate,
    numbers,
    bonus: draw.bonus,
  };
}

export function validateLottoHistory(value: unknown): LottoDraw[] {
  if (!Array.isArray(value) || value.length === 0)
    return fail(
      'draws',
      '실제 당첨 이력이 없습니다. 추천을 사용할 수 없습니다.',
    );
  const draws = value
    .map((draw, i) => validateLottoDraw(draw, `draws[${i}]`))
    .sort((a, b) => a.drawNo - b.drawNo);
  for (let i = 1; i < draws.length; i++) {
    if (draws[i].drawNo === draws[i - 1].drawNo)
      return fail('draws.drawNo', `${draws[i].drawNo}회가 중복되었습니다.`);
    if (draws[i].drawNo !== draws[i - 1].drawNo + 1)
      return fail(
        'draws.drawNo',
        `${draws[i - 1].drawNo + 1}회가 누락되었습니다. 연속된 이력이 필요합니다.`,
      );
    if (draws[i].drawDate <= draws[i - 1].drawDate)
      return fail(
        'draws.drawDate',
        `${draws[i].drawNo}회의 날짜 순서가 올바르지 않습니다.`,
      );
  }
  return draws;
}

export async function calculateHistoryHash(
  draws: LottoDraw[],
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(draws));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}

function validateSource(value: unknown): LottoHistorySource {
  const source = record(value, 'metadata.source');
  if (typeof source.name !== 'string' || !source.name.trim())
    return fail('metadata.source.name', '출처 이름이 필요합니다.');
  if (typeof source.url !== 'string')
    return fail('metadata.source.url', 'HTTPS 출처 URL이 필요합니다.');
  let url: URL;
  try {
    url = new URL(source.url);
  } catch {
    return fail('metadata.source.url', '유효한 URL이 필요합니다.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    return fail('metadata.source.url', '인증정보 없는 HTTPS URL이 필요합니다.');
  if (!isTimestamp(source.retrievedAt))
    return fail(
      'metadata.source.retrievedAt',
      '시간대가 포함된 수집 일시가 필요합니다.',
    );
  if (
    typeof source.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(source.sha256)
  )
    return fail('metadata.source.sha256', '원본 SHA-256이 필요합니다.');
  return {
    name: source.name,
    url: source.url,
    retrievedAt: source.retrievedAt,
    sha256: source.sha256,
  };
}

export async function createHistory(
  drawsInput: unknown,
  sourceInput: unknown,
  lastUpdated: string,
): Promise<LottoHistory> {
  const draws = validateLottoHistory(drawsInput);
  const source = validateSource(sourceInput);
  if (!isTimestamp(lastUpdated))
    return fail(
      'metadata.lastUpdated',
      '시간대가 포함된 갱신 일시가 필요합니다.',
    );
  const metadata: LottoHistoryMetadata = {
    kind: 'historical',
    firstDraw: draws[0].drawNo,
    latestDraw: draws[draws.length - 1].drawNo,
    drawCount: draws.length,
    latestDrawDate: draws[draws.length - 1].drawDate,
    lastUpdated,
    dataSha256: await calculateHistoryHash(draws),
    source,
  };
  return { metadata, draws };
}

export async function validateHistoryDocument(
  input: unknown,
): Promise<LottoHistory> {
  const document = record(input, 'history');
  const metadata = record(document.metadata, 'metadata');
  if (metadata.kind !== 'historical')
    return fail(
      'metadata.kind',
      '실제 이력만 허용합니다. 합성 데이터는 production에서 사용할 수 없습니다.',
    );
  if (typeof metadata.lastUpdated !== 'string')
    return fail('metadata.lastUpdated', '갱신 일시가 필요합니다.');
  const history = await createHistory(
    document.draws,
    metadata.source,
    metadata.lastUpdated,
  );
  for (const key of [
    'firstDraw',
    'latestDraw',
    'drawCount',
    'latestDrawDate',
    'dataSha256',
  ] as const) {
    if (metadata[key] !== history.metadata[key])
      return fail(
        `metadata.${key}`,
        '당첨 이력으로 재계산한 값과 일치하지 않습니다.',
      );
  }
  return history;
}
