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

// Describe a completed number; this score is never used to select tickets.
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
): PensionTicket[] {
  const numbers = new Set<string>();
  // Draw each digit with replacement. Repetition and positional overlap do not
  // affect selection; only an identical six-digit ticket is retried.
  for (
    let attempt = 0;
    attempt < config.maxGenerationAttempts &&
    numbers.size < config.recommendations;
    attempt++
  ) {
    numbers.add(generatePensionNumber(random));
  }
  if (numbers.size !== config.recommendations)
    throw new Error(
      '추천 번호를 충분히 생성하지 못했습니다. 다시 시도해 주세요.',
    );
  const groups = shuffle(config.groups, random);
  return [...numbers].map((number, index) => ({
    group: groups[index],
    number,
  }));
}
