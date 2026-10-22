import { analyzePension } from './algorithm';
import { PENSION_LOTTERY_CONFIG } from './config';
import type { PensionTicket } from './types';

export function PensionResults({ tickets }: { tickets: PensionTicket[] }) {
  return (
    <>
      <div className="rules-notice">
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
                    {String(index + 1).padStart(2, '0')}번 게임
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
          <p>추천 번호가 없습니다.</p>
          <p>‘연금복권 번호 추천’을 눌러 번호를 생성하세요.</p>
        </div>
      )}
    </>
  );
}
export function PensionMethodCard() {
  return (
    <section className="side-card pension-method">
      <div className="side-heading">
        <h3>연금복권 추천 기준</h3>
      </div>
      <p>
        여섯 자리 각각 0~9를 독립적으로 뽑습니다. 같은 숫자가 여러 번 나올 수
        있고, 앞자리 0도 유지합니다. 1~5조를 하나씩 추천합니다.
      </p>
      <p>
        연금복권 과거 당첨 이력은 사용하지 않습니다. 구매 가능한 번호인지는
        판매처에서 확인하세요.
      </p>
    </section>
  );
}
