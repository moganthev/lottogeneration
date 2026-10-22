import { LOTTO_CONFIG } from '../config';
import type { LottoConstraints, LottoNumbers } from '../types';

// Hard constraints only. Distribution preferences belong in scoring.ts.
export function isLottoNumbers(value: unknown): value is LottoNumbers {
  return (
    Array.isArray(value) &&
    value.length === LOTTO_CONFIG.size &&
    value.every(
      (n) =>
        Number.isInteger(n) && n >= LOTTO_CONFIG.min && n <= LOTTO_CONFIG.max,
    ) &&
    new Set(value).size === LOTTO_CONFIG.size
  );
}

export function combinationCount(n: number, k: number) {
  if (k < 0 || n < k) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - i + 1)) / i;
  return Math.round(result);
}

export function validateConstraints(
  constraints: LottoConstraints,
  needed: number = LOTTO_CONFIG.games,
) {
  const { fixed, excluded } = constraints;
  for (const list of [fixed, excluded]) {
    if (
      new Set(list).size !== list.length ||
      list.some(
        (n) =>
          !Number.isInteger(n) || n < LOTTO_CONFIG.min || n > LOTTO_CONFIG.max,
      )
    )
      throw new Error('번호는 중복 없이 1~45 사이에서 선택해 주세요.');
  }
  if (fixed.some((n) => excluded.includes(n)))
    throw new Error(
      '고정 번호와 제외 번호가 겹칩니다. 먼저 선택을 해제해 주세요.',
    );
  if (fixed.length > LOTTO_CONFIG.size - 1)
    throw new Error(
      '서로 다른 5게임을 만들려면 고정 번호는 최대 5개까지 선택할 수 있습니다.',
    );
  if (
    combinationCount(
      LOTTO_CONFIG.max - excluded.length - fixed.length,
      LOTTO_CONFIG.size - fixed.length,
    ) < needed
  )
    throw new Error(
      '서로 다른 게임을 만들 번호가 부족합니다. 고정 또는 제외 번호를 줄여 주세요.',
    );
}
