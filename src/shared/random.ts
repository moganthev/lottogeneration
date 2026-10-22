export interface RandomSource {
  next(): number;
}

// Buffer independent cryptographic values to avoid a browser API call per swap.
// 1,024 Uint32 values use 4 KiB, below Web Crypto's 65,536-byte request limit.
export function createCryptoRandomSource(
  fill: (buffer: Uint32Array) => void = (buffer) => {
    crypto.getRandomValues(buffer);
  },
): RandomSource {
  const buffer = new Uint32Array(1024);
  let cursor = buffer.length;
  return {
    next() {
      if (cursor === buffer.length) {
        fill(buffer);
        cursor = 0;
      }
      return buffer[cursor++] / 0x1_0000_0000;
    },
  };
}

export const browserRandom = createCryptoRandomSource();

// Deterministic source for reproducible tests and explicitly synthetic fixtures.
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    },
  };
}

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
