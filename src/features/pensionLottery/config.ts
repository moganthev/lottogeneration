export const PENSION_LOTTERY_CONFIG = {
  product: '연금복권720+',
  groups: [1, 2, 3, 4, 5],
  digits: 6,
  digitMin: 0,
  digitMax: 9,
  recommendations: 5,
  candidateCount: 1_200,
  scoring: { digitDiversity: 0.7, repetition: 0.2, positionFrequency: 0.1 },
  rules: {
    source: 'https://www.dhlottery.co.kr/pt720/intro',
    verification: 'official-page-verified',
    verifiedAt: '2026-10-22',
    note: '동행복권 공식 소개의 게임방법: 1조 000000 ~ 5조 999999. 사용자 지정 규칙과 일치함을 확인했습니다.',
  },
} as const;
