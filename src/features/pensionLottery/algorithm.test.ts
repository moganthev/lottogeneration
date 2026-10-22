import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../shared/random';
import {
  analyzePension,
  calculatePositionFrequency,
  isPensionTicket,
  recommendPension,
  generatePensionNumber,
} from './algorithm';

describe('pension lottery 720+ format', () => {
  it('can generate 000000 and preserves leading zeros from its random source', () => {
    expect(generatePensionNumber({ next: () => 0 })).toBe('000000');
    const digits = [0, 0, 0, 0.1, 0.3, 0.7];
    expect(generatePensionNumber({ next: () => digits.shift()! })).toBe(
      '000137',
    );
    expect(generatePensionNumber({ next: () => 0.999999 })).toBe('999999');
    expect(isPensionTicket({ group: 6, number: '000000' })).toBe(false);
  });
  it.each([1, 12, 42, 1000])(
    'produces five distinct groups and six-digit strings with seed %i',
    (seed) => {
      const tickets = recommendPension(seededRandom(seed));
      expect(tickets).toHaveLength(5);
      expect(new Set(tickets.map((ticket) => ticket.group))).toEqual(
        new Set([1, 2, 3, 4, 5]),
      );
      expect(new Set(tickets.map((ticket) => ticket.number)).size).toBe(5);
      expect(tickets.every(isPensionTicket)).toBe(true);
    },
  );
  it('preserves leading zeros and rejects invalid formats', () => {
    expect(isPensionTicket({ group: 1, number: '000012' })).toBe(true);
    for (const ticket of [
      { group: 6, number: '123456' },
      { group: 0, number: '000000' },
      { group: 1, number: '12345' },
      { group: 1, number: 123456 },
      { group: 1, number: '12345x' },
    ])
      expect(isPensionTicket(ticket)).toBe(false);
  });
  it('reports digit repetition independently of lotto scoring', () => {
    expect(analyzePension('123456')).toMatchObject({
      uniqueDigits: 6,
      maxRepeat: 1,
      score: 100,
    });
    expect(analyzePension('111111').score).toBeLessThan(
      analyzePension('123456').score,
    );
  });
  it('supports positional frequency only when actual history is supplied', () => {
    expect(calculatePositionFrequency([])[0]).toEqual(Array(10).fill(0));
    const history = [
      { group: 1, number: '012345' },
      { group: 2, number: '012346' },
    ];
    expect(calculatePositionFrequency(history)[0][0]).toBe(2);
    expect(calculatePositionFrequency(history)[5][5]).toBe(1);
    expect(analyzePension('012345', history).score).toBeGreaterThan(
      analyzePension('987654', history).score,
    );
  });
  it('is deterministic with a seed', () => {
    const tickets = recommendPension(seededRandom(123));
    expect(tickets).toEqual(recommendPension(seededRandom(123)));
  });
  it('keeps repeated digits and leading zeros in the final recommendations', () => {
    const numbers = [
      '000000',
      '111111',
      '112233',
      '101010',
      '999999',
      '123456',
      '234567',
      '345678',
      '456789',
      '567890',
    ];
    const values = numbers.flatMap((number) =>
      [...number].map((digit) => (Number(digit) + 0.5) / 10),
    );
    let cursor = 0;
    const tickets = recommendPension({
      next: () => values[cursor++ % values.length],
    });
    expect(tickets.map((ticket) => ticket.number)).toEqual(numbers.slice(0, 5));
    expect(tickets.every(isPensionTicket)).toBe(true);
  });
  it('does not suppress the natural occurrence of repeated digits', () => {
    const random = seededRandom(20261023);
    const tickets = Array.from({ length: 200 }, () =>
      recommendPension(random),
    ).flat();
    const repeated = tickets.filter(
      (ticket) => new Set(ticket.number).size < 6,
    ).length;
    // Independent draws repeat a digit in 1 - (10 × 9 × 8 × 7 × 6 × 5) / 10^6
    // = 84.88% of six-digit numbers. Use a fixed seed and a broad tolerance.
    expect(repeated / tickets.length).toBeGreaterThan(0.8);
    expect(repeated / tickets.length).toBeLessThan(0.9);
  });
  it('only retries identical six-digit numbers across recommendations', () => {
    const numbers = [
      '000000',
      '000000',
      '111111',
      '112233',
      '101010',
      '999999',
    ];
    const values = numbers.flatMap((number) =>
      [...number].map((digit) => (Number(digit) + 0.5) / 10),
    );
    let cursor = 0;
    const tickets = recommendPension({
      next: () => values[cursor++ % values.length],
    });
    expect(tickets.map((ticket) => ticket.number)).toEqual([
      '000000',
      '111111',
      '112233',
      '101010',
      '999999',
    ]);
  });
  it('stops if a broken random source cannot produce five distinct tickets', () => {
    expect(() => recommendPension({ next: () => 0 })).toThrow(
      '추천 번호를 충분히 생성하지 못했습니다',
    );
  });
});
