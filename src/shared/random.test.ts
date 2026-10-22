import { describe, expect, it } from 'vitest';
import { createCryptoRandomSource } from './random';

describe('buffered Web Crypto random source', () => {
  it('includes zero, excludes one and refills without dropping the boundary value', () => {
    let fills = 0;
    const random = createCryptoRandomSource((buffer) => {
      fills++;
      buffer.fill(fills === 1 ? 0 : 0xffffffff);
      if (fills === 1) buffer[1023] = 0xffffffff;
    });
    expect(random.next()).toBe(0);
    for (let i = 1; i < 1023; i++) expect(random.next()).toBe(0);
    expect(fills).toBe(1);
    expect(random.next()).toBe(0xffffffff / 0x1_0000_0000);
    const next = random.next();
    expect(fills).toBe(2);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });
});
