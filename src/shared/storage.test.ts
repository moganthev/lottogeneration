import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyState, loadState, saveState } from './storage';

describe('best-effort device persistence', () => {
  let contents: string | null;
  beforeEach(() => {
    contents = null;
    vi.stubGlobal('localStorage', {
      getItem: () => contents,
      setItem: (_key: string, value: string) => {
        contents = value;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('round trips selected tab and valid constraints', () => {
    const state = {
      ...emptyState,
      tab: 'pension' as const,
      constraints: { fixed: [7], excluded: [44] },
    };
    expect(saveState(state)).toBe(true);
    expect(loadState()).toEqual(state);
  });
  it('recovers from malformed JSON and invalid saved constraints', () => {
    contents = '{';
    expect(loadState()).toEqual(emptyState);
    contents = JSON.stringify({
      ...emptyState,
      constraints: { fixed: [7], excluded: [7] },
    });
    expect(loadState()).toEqual(emptyState);
    contents = JSON.stringify({ ...emptyState, games: 'invalid' });
    expect(loadState()).toEqual(emptyState);
  });
  it('rejects saved games that do not satisfy their applied constraints', () => {
    contents = JSON.stringify({
      ...emptyState,
      games: Array.from({ length: 5 }, (_, i) => [i + 1, 10, 20, 30, 40, 45]),
      appliedConstraints: { fixed: [7], excluded: [] },
    });
    expect(loadState()).toEqual(emptyState);
  });
  it('handles disabled or full browser storage without crashing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(loadState()).toEqual(emptyState);
    expect(saveState(emptyState)).toBe(false);
  });
});
