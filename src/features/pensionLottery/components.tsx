import { Info, Ticket } from 'lucide-react';
import { analyzePension } from './algorithm';
import { PENSION_LOTTERY_CONFIG } from './config';
import type { PensionTicket } from './types';

export function PensionResults({ tickets }: { tickets: PensionTicket[] }) {
  return (
    <>
      <div className="rules-notice">
        <Info size={16} />
        <p>
          <strong>연금복권720+ 규칙</strong> · 1~5조, 000000~999999. 앞자리 0을
          보존합니다. 공식 안내 확인 {PENSION_LOTTERY_CONFIG.rules.verifiedAt}.{' '}
          <a
            href={PENSION_LOTTERY_CONFIG.rules.source}
            target="_blank"
            rel="noreferrer"
          >
            공식 안내 확인 ↗
          </a>
        </p>
      </div>
      {tickets.length ? (
        <div className="game-list">
          {tickets.map((ticket, index) => {
            const analysis = analyzePension(ticket.number);
            return (
              <article
                className="game-card pension-card"
                key={`${ticket.group}-${ticket.number}`}
              >
                <div className="game-topline">
                  <span className="game-label">
                    <span className="game-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>{' '}
                    PICK {index + 1}
                  </span>
                  <span className="pension-tag">연금복권720+</span>
                </div>
                <div
                  className="pension-number"
                  aria-label={`${ticket.group}조 ${ticket.number}`}
                >
                  <span className="pension-group">
                    {ticket.group}
                    <small>조</small>
                  </span>
                  <span className="pension-digits">
                    {[...ticket.number].map((digit, i) => (
                      <span key={i}>{digit}</span>
                    ))}
                  </span>
                </div>
                <div className="pension-meta">
                  <span>
                    서로 다른 숫자 <strong>{analysis.uniqueDigits}개</strong>
                  </span>
                  <span>
                    최대 반복 <strong>{analysis.maxRepeat}회</strong>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Ticket size={32} />
          </span>
          <h3>이번에는 어떤 숫자가 좋을까요?</h3>
          <p>
            다섯 개의 서로 다른 조와 여섯 자리 숫자를 골라요.
            <br />
            앞자리의 0도 소중한 번호로 유지합니다.
          </p>
        </div>
      )}
    </>
  );
}
export function PensionMethodCard() {
  return (
    <section className="side-card">
      <div className="side-heading">
        <h3>연금복권, 이렇게 골라요</h3>
        <Ticket size={18} />
      </div>
      <p className="side-description">
        로또와는 다른 방식으로
        <br />
        여섯 자리 숫자의 구성을 살펴요.
      </p>
      <ul className="method-list">
        <li>
          <span>01</span>
          <div>
            <strong>자리의 다양성</strong>
            <p>한 숫자가 지나치게 반복되는 정도를 살펴요.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>번호 사이의 차이</strong>
            <p>같은 자리에 같은 숫자가 겹치는 정도를 줄여요.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>다섯 조를 고르게</strong>
            <p>
              1~5조를 하나씩 선택합니다. 구매 가능 여부는 판매처에서 확인하세요.
            </p>
          </div>
        </li>
      </ul>
      <p className="picker-note">
        연금복권 과거 데이터는 연결되어 있지 않아요. 자리별 빈도는 데이터가 있을
        때만 사용합니다.
      </p>
    </section>
  );
}
