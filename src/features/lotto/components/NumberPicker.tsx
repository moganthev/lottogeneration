import { useState } from 'react';
import { LockKeyhole, Ban, RotateCcw } from 'lucide-react';
import type { LottoConstraints } from '../types';
import { validateConstraints } from '../algorithms/recommend';

export function NumberPicker({
  constraints,
  disabled,
  onChange,
  id = 'picker-title',
}: {
  constraints: LottoConstraints;
  disabled: boolean;
  onChange(value: LottoConstraints): void;
  id?: string;
}) {
  const [mode, setMode] = useState<'fixed' | 'excluded'>('fixed');
  const [error, setError] = useState('');
  function toggle(n: number) {
    const selected = constraints[mode];
    const next = {
      ...constraints,
      [mode]: selected.includes(n)
        ? selected.filter((v) => v !== n)
        : [...selected, n].sort((a, b) => a - b),
    };
    try {
      validateConstraints(next);
      setError('');
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '선택을 확인해 주세요.');
    }
  }
  return (
    <section className="side-card picker-card" aria-labelledby={id}>
      <div className="side-heading">
        <h3 id={id}>나만의 번호 설정</h3>
        <button
          className="text-button"
          disabled={disabled}
          onClick={() => {
            onChange({ fixed: [], excluded: [] });
            setError('');
          }}
        >
          <RotateCcw size={12} />
          초기화
        </button>
      </div>
      <p className="side-description">
        마음에 드는 번호는 고정하고,
        <br />
        잠시 빼두고 싶은 번호는 제외하세요.
      </p>
      <div className="picker-modes">
        <button
          className={mode === 'fixed' ? 'selected' : ''}
          onClick={() => {
            setMode('fixed');
            setError('');
          }}
          aria-pressed={mode === 'fixed'}
        >
          <LockKeyhole size={13} />
          고정 <span>{constraints.fixed.length}</span>
        </button>
        <button
          className={mode === 'excluded' ? 'selected' : ''}
          onClick={() => {
            setMode('excluded');
            setError('');
          }}
          aria-pressed={mode === 'excluded'}
        >
          <Ban size={13} />
          제외 <span>{constraints.excluded.length}</span>
        </button>
      </div>
      <div className="number-grid">
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
          const fixed = constraints.fixed.includes(n);
          const excluded = constraints.excluded.includes(n);
          return (
            <button
              key={n}
              disabled={disabled}
              className={`${fixed ? 'number-fixed' : ''} ${excluded ? 'number-excluded' : ''}`}
              aria-label={`${n}번 ${mode === 'fixed' ? '고정' : '제외'}`}
              aria-pressed={fixed || excluded}
              onClick={() => toggle(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="picker-legend">
        <span>
          <i className="legend-fixed" />
          고정 번호
        </span>
        <span>
          <i className="legend-excluded" />
          제외 번호
        </span>
      </div>
      <p className="picker-note">
        고정은 최대 5개 · 다음 5게임 추천부터 적용
        <br />
        같은 번호를 다시 누르면 선택이 해제됩니다.
      </p>
    </section>
  );
}
