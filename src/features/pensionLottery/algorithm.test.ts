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
  it('is deterministic with a seed and discourages positional overlap', () => {
    const tickets = recommendPension(seededRandom(123));
    expect(tickets).toEqual(recommendPension(seededRandom(123)));
    for (let i = 0; i < tickets.length; i++)
      for (let j = i + 1; j < tickets.length; j++) {
        const overlap = [...tickets[i].number].filter(
          (digit, p) => digit === tickets[j].number[p],
        ).length;
        expect(overlap).toBeLessThanOrEqual(2);
      }
  });
});
