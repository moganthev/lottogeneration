import { browserRandom, shuffle, type RandomSource } from '../../shared/random';
import { PENSION_LOTTERY_CONFIG as config } from './config';
import type { PensionAnalysis, PensionTicket } from './types';

export function isPensionTicket(value: unknown): value is PensionTicket {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as Partial<PensionTicket>;
  return (
    config.groups.some((g) => g === ticket.group) &&
    typeof ticket.number === 'string' &&
    new RegExp(`^\\d{${config.digits}}$`).test(ticket.number)
  );
}

export function generatePensionNumber(
  random: RandomSource = browserRandom,
): string {
  return Array.from(
    { length: config.digits },
    () =>
      Math.floor(random.next() * (config.digitMax - config.digitMin + 1)) +
      config.digitMin,
  ).join('');
}

export function calculatePositionFrequency(history: PensionTicket[]) {
  const frequencies = Array.from({ length: config.digits }, () =>
    Array<number>(10).fill(0),
  );
  for (const ticket of history) {
    if (!isPensionTicket(ticket))
      throw new Error('연금복권 데이터 형식이 올바르지 않습니다.');
    [...ticket.number].forEach(
      (digit, position) => frequencies[position][Number(digit)]++,
    );
  }
  return frequencies;
}

export function analyzePension(
  number: string,
  history: PensionTicket[] = [],
): PensionAnalysis {
  const counts = Array<number>(10).fill(0);
  [...number].forEach((digit) => counts[Number(digit)]++);
  const uniqueDigits = new Set(number).size;
  const maxRepeat = Math.max(...counts);
  const weights = config.scoring;
  const positionWeight = history.length ? weights.positionFrequency : 0;
  const frequencies = calculatePositionFrequency(history);
  const frequencyScore =
    [...number].reduce((sum, digit, position) => {
      const max = Math.max(1, ...frequencies[position]);
      return sum + frequencies[position][Number(digit)] / max;
    }, 0) / config.digits;
  const score =
    ((uniqueDigits / config.digits) * weights.digitDiversity +
      (1 - (maxRepeat - 1) / (config.digits - 1)) * weights.repetition +
      frequencyScore * positionWeight) /
    (weights.digitDiversity + weights.repetition + positionWeight);
  return { uniqueDigits, maxRepeat, score: Math.round(score * 100) };
}

export function recommendPension(
  random: RandomSource = browserRandom,
  history: PensionTicket[] = [],
): PensionTicket[] {
  const pool = new Map<string, number>();
  for (let i = 0; i < config.candidateCount; i++) {
    const number = generatePensionNumber(random);
    pool.set(number, analyzePension(number, history).score);
  }
  const remaining = [...pool].map(([number, score]) => ({ number, score }));
  const groups = shuffle(config.groups, random);
  const selected: PensionTicket[] = [];
  while (selected.length < config.recommendations && remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    remaining.forEach((candidate, index) => {
      const overlap = Math.max(
        0,
        ...selected.map(
          (ticket) =>
            [...ticket.number].filter(
              (digit, i) => digit === candidate.number[i],
            ).length,
        ),
      );
      const score = candidate.score - overlap * 15;
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    const candidate = remaining.splice(bestIndex, 1)[0];
    selected.push({ group: groups[selected.length], number: candidate.number });
  }
  if (selected.length !== config.recommendations)
    throw new Error(
      '추천 번호를 충분히 생성하지 못했습니다. 다시 시도해 주세요.',
    );
  return selected;
}
