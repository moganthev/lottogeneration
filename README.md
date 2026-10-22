# LottoGeneration

React · TypeScript 기반의 모바일 우선 로또 6/45 / 연금복권720+ 웹·PWA입니다. 서버나 데이터베이스 없이 브라우저에서 번호를 분석하며, GitHub Pages에 정적 파일로 배포할 수 있습니다.

> **실제 당첨 이력 적용:** 동행복권 공개 조회에서 받은 **1회~1,246회, 총 1,246건**을 정적으로 포함합니다. 마지막 추첨일은 **2026-10-17**, 수집·검증일은 **2026-10-22**입니다. 자동 실시간 갱신이 아니라 빌드에 포함된 스냅샷입니다. 앱이 추천할 때 외부 사이트를 호출하지 않습니다.
>
> **연금복권 규칙 확인:** 2026-10-22 [동행복권 공식 상품 안내](https://www.dhlottery.co.kr/pt720/intro)의 게임방법에서 **1조 000000 ~ 5조 999999**를 직접 확인했습니다. `000000`과 앞자리 0을 보존합니다.

## 확률에 관한 원칙

LottoGeneration은 로또 당첨번호를 예측하는 서비스가 아닙니다.

로또 추첨이 독립적인 무작위 추첨이라면 모든 6개 번호 조합의 당첨 확률은 동일합니다. 이 애플리케이션은 과거 당첨번호 통계와 번호 분포를 분석하여 특정 형태로 과도하게 편향된 조합을 줄이고, 5개의 추천 게임이 서로 다양한 번호를 포함하도록 구성하는 것을 목적으로 합니다. 로또 6/45의 1등 확률은 **1 / 8,145,060**입니다.

**앱에서 표시되는 조합 평가점수는 실제 당첨 확률을 의미하지 않습니다.** 오래 미출현한 번호가 다음 회차에 나올 확률이 높아진다고 가정하지 않습니다. 연금복권은 각 자리의 숫자를 독립적으로 무작위 추첨하며, 같은 숫자의 반복을 허용합니다.

## 주요 기능

- 로또: 매번 서로 다른 5게임 추천, 모든 번호는 1~45에서 중복 없이 6개·오름차순
- 전체 게임에 적용하는 고정 번호(최대 5개), 제외 번호, 충돌·불가능한 조건 안내
- 개별 게임 재추천: 나머지 4게임을 유지하고 그 게임들과의 중복을 다시 평가
- 조건을 바꾼 경우 전체 재추천으로 적용; 기존 결과에는 이전 적용 조건을 유지
- 게임별 분석: 평가점수, 홀짝, 저·고번호, 번호합, 구간분포, 연속번호, 끝수, 간격, AC Value, 과거 당첨 조합 유사도, 미출현 정보
- 전체 고유 번호 수, 게임 간 평균 중복, 한 번호의 최대 사용 횟수
- 연금복권: 5개 조와 여섯 자리 번호 추천, 같은 숫자 반복 허용, 앞자리 0 유지, 반복 횟수 표시
- 최근 추천 1세트, 선택 탭, 고정·제외 조건을 localStorage에 저장
- 모바일 번호 설정 접기/펼치기, 키보드 탭 이동, 분석 펼치기, 상태·오류 안내
- PWA 설치 안내, 새 버전 업데이트 알림, 최초 캐시 이후 오프라인 추천

localStorage가 비활성화되거나 용량이 부족해도 현재 페이지에서 추천할 수 있습니다. 이때 새로고침 이후 저장 결과 복원은 보장되지 않습니다. 로그인, 개인정보 수집, 외부 분석 도구, 유료 API는 없습니다.

## 실행 방법

Node.js 24 LTS (`.nvmrc`), npm을 권장합니다. 최소 Node.js는 22.12입니다.

```bash
npm install
npm run dev
```

Vite가 출력하는 `/lottogeneration/` 경로로 접속합니다. 저장소 이름의 실제 대소문자를 반영한 기본 경로입니다.

```bash
npm ci                 # lockfile과 정확히 일치하는 설치 (CI·재설치)
npm run lint           # ESLint, 경고도 실패 처리
npm run test           # Vitest 단위 테스트, 일회 실행
npm run test:watch     # 개발 중 테스트
npm run data:check     # 실제 이력·metadata·SHA-256 검증
npm run analyze        # 고정 seed 200세트 선택 편향 분석
npm run build          # 데이터 검증 + strict TypeScript + production build + PWA
npm run preview        # 생성한 dist 로컬 검증
npm run format         # Prettier 적용
npm run format:check   # 서식 검사
```

브라우저 통합 테스트는 production build를 사용합니다. Playwright가 preview 서버를 자동으로 시작합니다.

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

Linux에서 시스템 라이브러리도 필요한 경우 `npx playwright install --with-deps chromium`을 사용합니다. 이미 설치된 Chromium은 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`로 사용할 수 있습니다.

`.npmrc`는 npm 캐시를 쓰기 가능한 프로젝트 내 `.npm-cache/`에 둡니다. 해당 디렉터리는 Git에서 제외됩니다. `.env`나 서버 자격 증명은 필요하지 않습니다.

## 기술과 구조

React 19, TypeScript strict, Vite 7, 기본 CSS, Web Worker, vite-plugin-pwa/Workbox, Vitest, Playwright, ESLint, Prettier를 사용합니다. 상태 관리는 React state로 충분하며 Redux와 별도 CSS 프레임워크를 사용하지 않습니다. UI 아이콘은 Lucide(ISC), 앱 아이콘은 직접 제작한 SVG와 PWA 설치용 PNG입니다. 외부 폰트나 이미지 요청은 없습니다.

```text
.github/workflows/deploy.yml          검증과 Pages 배포
e2e/app.spec.ts                      실제 브라우저 기능·반응형·오프라인 검사
data/sources/                       공식 번호·날짜 CSV와 출처·해시 기록
docs/algorithm-analysis.json        재현 가능한 시뮬레이션 실행 결과
scripts/
  import-lotto-history.ts            오프라인 CSV → 검증된 production JSON
  check-lotto-history.ts             데이터·metadata·해시 검증
  analyze.ts                        추천 분포·선택 편향 진단
public/                             직접 제작한 앱 아이콘
src/
  app/
    App.tsx                         탭·추천 작업·화면 상태
    components/SiteLayout.tsx        헤더·소개·설명·푸터
    styles.css                      반응형 UI
  features/
    lotto/
      algorithms/
        constraints.ts              절대 조건 (Hard Constraint)
        statistics.ts               전체·최근 10/30/50회와 분포 통계
        scoring.ts                  조합 점수 계산
        recommend.ts                후보 생성·순위·다양성 선택
        lotto.test.ts               도메인 단위 테스트
      components/                   번호 선택기·게임 카드
      config.ts                     후보 개수·점수 가중치·다양성 계수
      data/lotto-history.json        실제 당첨 이력과 검증 metadata
      services/
        historyRepository.ts        정적 데이터 조회 인터페이스
        historyValidation.ts        unknown 입력·회차·날짜·metadata·해시 검증
        recommendationService.ts    UI ↔ Web Worker 통신
        recommendationWorker.ts     UI 스레드 밖에서 추천 실행
      types.ts
    pensionLottery/
      algorithm.ts                  연금복권 전용 독립 추첨·분석
      components.tsx                연금복권 결과·설명 UI
      config.ts                     상품 규칙·검증 상태·가중치
      types.ts
      algorithm.test.ts
  shared/
    components/                     번호 공·PWA 설치 및 업데이트
    random.ts                       RandomSource·production crypto·테스트 seed
    storage.ts                      검증하는 best-effort 기기 저장
    storage.test.ts
```

## 로또 추천 파이프라인

```text
LottoHistoryRepository
  → 전체/최근 빈도·미출현·번호합 분포 통계
  → 고정·제외 조건을 만족하는 최대 5,000개 고유 후보
  → 후보별 분석과 0~100 조합 평가점수
  → 점수순 상위 500개 후보
  → 선택한 게임과의 중복·번호 사용량·신규 번호를 재평가
  → 서로 다른 최종 5게임
```

알고리즘은 JSON을 직접 import하지 않습니다. UI가 Repository로 받은 이력을 추천 서비스에 전달합니다. 후보 생성과 평가는 Web Worker에서 실행되어 추천 중에도 메인 UI가 응답할 수 있습니다. 기본 후보 수와 상위 후보 수는 `LOTTO_CONFIG`에서 변경할 수 있습니다. 조건으로 가능한 조합이 5,000개보다 적으면 전부 열거하며, 5게임조차 만들 수 없으면 조건 오류를 반환합니다. 랜덤 샘플링 시도 횟수에도 상한을 둡니다.

Production은 `crypto.getRandomValues()`를 사용하는 `RandomSource`를 주입합니다. 1,024개의 독립적인 32비트 값을 4KiB 버퍼로 받아 셔플의 매 단계마다 브라우저 API를 호출하는 비용을 줄입니다. 테스트에는 재현 가능한 `seededRandom(seed)`를 주입합니다. 추천은 매회 달라질 수 있고 이전 전체 세트와 일부 게임이 우연히 같을 수 있습니다. 개별 재추천은 이전 해당 게임과 나머지 4게임의 완전 동일 조합을 제외합니다. 더 이상 다른 조합이 없으면 오류를 안내하고 기존 결과를 보존합니다.

### Scoring 기준

모든 가중치는 `LOTTO_SCORE_WEIGHTS`에서 관리하며, 가중치 합으로 정규화합니다. 각 요소는 0~1, 최종 점수는 반올림한 0~100입니다. 아래 값들은 초기 휴리스틱이며 실제 당첨 결과에 맞춘 예측 모델이나 검증된 최적 가중치가 아닙니다.

| 요소      | 가중치 | 기준                                                   |
| --------- | -----: | ------------------------------------------------------ |
| 전체 빈도 |   0.04 | 각 번호 빈도를 관측 최대 빈도로 나눈 평균              |
| 최근 빈도 |   0.02 | 최근 30회 빈도, 같은 정규화; 전체 빈도와 합쳐 최대 6%  |
| 홀짝      |   0.17 | 실제 이력의 홀수 개수 분포                             |
| 저·고번호 |   0.13 | 1~22 / 23~45의 실제 이력 분포                          |
| 구간 분산 |   0.16 | 각 번호 구간의 실제 이력별 개수 분포                   |
| 번호합    |   0.20 | 실제 입력 이력의 평균·표준편차 기준 Gaussian 형태 점수 |
| 연속번호  |   0.08 | 2개 연속은 허용, 긴 연속 구간에 점진적 패널티          |
| 동일 끝수 |   0.07 | 동일 끝수 3개 이상부터 점진적 패널티                   |
| 번호 간격 |   0.08 | 최대 간격이 15를 넘을 때 점진적 패널티                 |
| AC Value  |   0.05 | 산술적 복잡성, 영향력 최대 5점                         |

전체·최근 빈도의 합산 비중을 MVP의 15%에서 **6%**로 낮췄습니다. 미출현 기간과 과거 조합 최대 일치는 **UI 참고 정보로만** 사용하고 점수에서 제외했습니다. 많이 나온 번호가 앞으로 더 잘 나온다고 가정하지 않습니다.

홀짝·저고·구간은 경험 분포의 `0.25 + 0.75 × sqrt((해당 빈도+1)/(최대 빈도+1))`를 사용합니다. 스무딩과 0.25 하한으로 드문 형태에도 점진적으로 점수를 부여합니다. 홀짝 3:3 등을 절대 조건으로 강제하지 않습니다. 번호합의 평균·중앙값·표준편차·25/75 분위수, 최근 10/30/50회 빈도, 미출현, 홀짝·저고·구간·연속·끝수·AC 분포를 모두 재계산합니다.

`constraints.ts`의 번호 범위·개수·중복·고정·제외는 **Hard Constraint**입니다. `scoring.ts`의 분포 요소는 **Soft Score**입니다. 빈 이력에 대한 통계 함수의 중립값은 단위 테스트용 계산 편의를 위한 것으로, production 추천 진입점은 빈 이력을 거부합니다.

1,246회 이력을 후보 5,000개마다 모두 비교하는 비용을 피하기 위해 과거 조합 유사도는 **최종 5게임에만** 계산합니다. 후보 평가와 최종 평가의 점수는 동일하고 UI 참고 분석만 추가됩니다.

### AC Value

정렬 여부와 무관하게 모든 두 번호 사이의 **서로 다른 양의 차이 개수 − (번호 개수 − 1)** 입니다. 여섯 번호에서는 5를 뺍니다.

- `[1, 2, 3, 4, 5, 6]`: 차이는 `{1, 2, 3, 4, 5}` → AC = 0
- `[1, 2, 4, 8, 16, 32]`: 서로 다른 차이 15개 → AC = 10

정확한 계산은 단위 테스트로 확인합니다. AC는 조합의 산술적 다양성을 설명하는 지표이며 절대적인 당첨 기준이 아닙니다.

### 5게임 다양성 선택

상위 후보에서 하나씩 선택하는 탐욕적 선택을 사용합니다. 먼저 최상위 점수의 85% 미만 후보를 제외해 고유 번호 수만을 위해 낮은 점수의 조합을 끌어오지 않습니다. 가능한 후보가 적은 조건에서는 필요한 게임 수만큼의 상위 후보를 확보하도록 경계를 완화합니다.

```text
선택 점수 = 조합 점수
          + 아직 사용하지 않은 번호 수 × 3
          − 이미 선택한 게임과의 최대 교집합 크기 × 9
          − 각 번호의 누적 사용 횟수 합 × 3
```

고정 번호는 모든 게임에서 반복되어야 하므로 제외하지 않습니다. 같은 번호 조합은 한 세트에 두 번 포함하지 않습니다. 고정·제외 조건과 후보 풀에 따라 중복을 완전히 없애지 못할 수 있으며, 전역 최적해를 보장하지 않습니다. 화면에는 실제 고유 번호 수(최대 30), 게임 간 평균 중복, 한 번호 최대 반복 횟수를 표시합니다. 함수는 `uniqueNumberCount`, `averagePairSimilarity`, `maxPairSimilarity`, `numberUsageCount`도 반환하며 기존 이름을 유지합니다.

## 데이터 출처·검증·갱신

현재 production JSON에는 합성 이력이 없습니다. 기존 합성 60건은 제거했습니다. 테스트 내부의 작은 수학 예제만 테스트 전용으로 사용합니다.

- 출처: [동행복권 로또6/45 추첨 결과](https://www.dhlottery.co.kr/lt645/result)
- 공식 화면의 회차 범위 조회: `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchStrLtEpsd=1&srchEndLtEpsd=1246`
- 원본에서 **번호·보너스·회차·날짜 사실정보만** 추출했습니다. 사이트 문구·이미지·로고·상금 표·소프트웨어는 복사하지 않았으며 원사이트 전체에 대한 재배포 라이선스를 주장하지 않습니다.
- `data/sources/lotto-official-1-1246.csv`: 조회한 사실정보의 입력 스냅샷
- 같은 이름의 `.source.json`: 공식 URL, 수집 일시, 원본 응답 SHA-256, CSV SHA-256
- production metadata: 첫/최신 회차, 건수, 최신 추첨일, 갱신일, 원본 CSV SHA-256, 정규화 데이터 SHA-256
- 별도의 공식 회차 조회 경로(`selectPstLt645InfoNew.do`)에서도 처음·마지막 각 10건, 총 20건을 대조했습니다.

SHA-256은 입력 이후 변경을 탐지하는 무결성 검사입니다. 공식 서명이나 데이터 출처 자체를 인증하는 수단은 아닙니다. 공식 출처와 결과의 일치 여부는 원본 조회로 확인합니다.

데이터는 `drawNo`, `drawDate`(YYYY-MM-DD), 6개 번호 tuple, `bonus`를 사용합니다. `validateLottoDraw()`와 `validateLottoHistory()`는 unknown 입력을 검증하며, 오류에 배열 위치·필드·회차를 표시합니다. 회차 중복·누락, 날짜 오류·역순, 1~45 범위, 본번호 6개·중복, 보너스 범위·본번호 중복을 거부합니다. 미출현 기간과 최근 창이 누락 회차를 건너뛰지 않도록 연속된 이력만 받습니다. 정렬은 복사본에서 수행합니다.

Repository 로딩 시 metadata를 이력에서 다시 계산하고 데이터 해시를 확인합니다. 검증 실패나 빈 이력이면 **로또 추천을 비활성화하고 오류를 표시**하며 합성/무작위 데이터로 fallback하지 않습니다. 연금복권은 이 이력에 의존하지 않아 계속 사용할 수 있습니다. 빌드도 먼저 `data:check`를 실행하므로 잘못된 이력을 게시하지 않습니다.

### CSV 가져오기

앱과 분리된 로컬 도구입니다. Node.js 24에서 실행합니다. XLSX 파서를 추가하지 않고 CSV UTF-8만 지원합니다. 공식 다운로드 파일을 사용할 경우 스프레드시트에서 아래 9개 열을 선택·이름 변경하여 CSV UTF-8로 저장하세요. 날짜는 YYYY-MM-DD로 변환합니다.

```csv
drawNo,drawDate,n1,n2,n3,n4,n5,n6,bonus
1,2002-12-07,10,23,29,33,37,40,16
2,2002-12-14,9,13,21,25,32,42,2
```

```bash
npm run data:import -- ./data/source.csv \
  --source-url 'https://www.dhlottery.co.kr/lt645/result' \
  --source-name '동행복권 공식 다운로드' \
  --retrieved-at '2026-10-22T00:00:00Z'
npm run data:check -- ./data/source.csv
npm run test
npm run build
```

`--retrieved-at`을 생략하면 가져오기 시각을 기록합니다. `--output`으로 검토용 출력 경로를 지정할 수 있습니다. 검증이 전부 통과한 후 임시 파일을 atomic rename으로 교체하므로 실패 시 기존 production 파일이 유지됩니다. **입력은 전체 스냅샷이며 기존 이력을 대체합니다.** 최신 몇 회차만 추가하는 merge 도구가 아닙니다. 부분/오래된 파일로 전체 데이터를 축소하지 않도록 입력 범위를 확인하세요. 잘못된 헤더, 수식, 모호한 날짜, 정수의 조용한 형변환은 허용하지 않습니다. 데이터 source 메타데이터는 공급자가 밝힌 출처 기록이며 JSON 구조 검사만으로 진위를 증명하지는 않습니다.

포함된 스냅샷을 다시 생성하려면 같은 명령의 입력을 `data/sources/lotto-official-1-1246.csv`로 지정하고 `.source.json`의 실제 수집 일시와 URL을 사용하세요. 번호·날짜와 데이터 해시는 재현되며 `lastUpdated`는 가져온 시각으로 갱신됩니다.

현재 자동 수집 스케줄은 없습니다. 공식 사이트에서 새 전체 이력을 받아 import → 검증 → 테스트 → 빌드 → main 반영으로 갱신합니다. 자동 접근이 거부되면 우회하지 말고 공식 다운로드/수동 CSV 입력을 사용하세요. 서버·비밀 키·런타임 외부 요청은 필요하지 않습니다.

### 알고리즘 분석 도구

```bash
npm run analyze
npm run analyze -- --iterations 1000 --seed 20261022 --output /tmp/lotto-analysis.json
```

기본 200세트(1,000게임), 최대 10,000세트까지 설정할 수 있습니다. 실제 이력·현재 config·seed를 기록하고 평균/최저/최고 점수, 고유 번호 수, 평균/최대 게임 유사도, 번호별 선택 빈도와 균등 랜덤 비교, 홀짝·합계 분포, 실제 이력의 통계 합계를 출력합니다. 실행 시간 외의 결과는 동일한 입력에서 재현 가능합니다.

[`docs/algorithm-analysis.json`](docs/algorithm-analysis.json)에 seed 20261022, 200세트의 실행 결과를 보관했습니다. 평균 점수 97.366, 범위 94~98, 평균 고유 번호 29.985개, 게임 간 평균 중복 0.0015개였습니다. 번호별 선택 빈도는 균등 평균의 0.735~1.215배로, 사전 점검 기준인 0.5~1.5배를 벗어난 번호는 없었습니다. 이는 한 seed·한 이력·고정/제외 없는 유한한 시뮬레이션의 관측이며 장기 균등성·실제 당첨 성과를 보장하지 않습니다. 기준은 통계적 유의성 검정이 아닌 개발용 진단선입니다. 추천과 독립 랜덤 baseline은 다양성 선택 유무가 다르므로 빈도 비교용으로만 해석하세요.

## 연금복권 추천 방식

로또 알고리즘을 재사용하지 않습니다. `PENSION_LOTTERY_CONFIG`에서 조·자리 수·숫자 범위·최대 생성 시도를 관리합니다. 각 자리에서 0~9를 독립적으로 복원 추출하여 여섯 자리 번호를 만듭니다. `112233`, `111111`, `000000` 등 반복 숫자가 있는 번호도 최종 추천에 그대로 포함될 수 있습니다. 숫자 다양성 점수나 자리 중복 패널티로 후보를 선별하지 않습니다. 현재 연금복권 이력은 연결되어 있지 않으며 추천에 이력 빈도를 사용하지 않습니다.

추천 내에서 여섯 자리 번호 전체가 완전히 같을 때만 다시 뽑습니다. 번호 안의 숫자 반복이나 다른 번호와 같은 자리에 같은 숫자가 나오는 것은 제한하지 않습니다. 조는 1~5조를 무작위 순서로 하나씩 배정합니다. 문자열로 번호를 보관하므로 `000012`의 0이 유지됩니다. 생성 시도에 상한을 두어 잘못된 난수 공급원에서도 무한 반복하지 않습니다. 실제 구매 가능한 번호인지는 판매처에서 확인해야 합니다. 공식 상품 안내의 규칙 확인 일자는 2026-10-22입니다. 최종 추천의 반복 숫자·앞자리 0 보존과 고정 seed의 반복 숫자 비율을 회귀 테스트합니다. 화면의 서로 다른 숫자 수와 최대 반복 횟수는 선택 결과를 설명하며 추천을 거르는 데 사용하지 않습니다.

## PWA와 오프라인

- 이름 `LottoGeneration`, short name `LottoGen`, 한국어 manifest
- standalone 모드, theme/background color, 자체 제작 SVG·192/512 PNG·Apple touch icon
- `base`와 일치하는 `start_url`, `scope`, navigation fallback
- Workbox가 앱 셸, 스타일, 정적 데이터가 번들된 JS, 추천 Worker를 precache
- 최초 설치된 서비스 워커가 페이지를 제어하도록 `clientsClaim` 설정
- 새 버전이 준비되면 사용자가 업데이트를 선택; 작업 도중 강제 갱신하지 않음
- 배포 직후 이전 화면이 남으면 `?refresh=1` 링크로 진입: 대기 중인 새 서비스 워커를 활성화하고 해당 창만 새로 열며, 저장된 번호는 유지

Android Chrome의 ‘앱 설치’, iPhone Safari의 공유 → ‘홈 화면에 추가’를 사용하세요. 앱 상단에 설치 안내가 있습니다. 설치 가능 여부는 브라우저와 OS 정책에 따라 다릅니다. 배포 환경은 HTTPS가 필요하며, **최초 온라인 접속과 서비스 워커 캐시 완료 이후** 기본 추천이 오프라인에서 작동합니다. 초기 개발 서버에서는 PWA를 활성화하지 않으므로 `build` + `preview`로 검증하세요.

앱의 업데이트 알림을 선택하거나 브라우저의 사이트 데이터 삭제를 통해 이전 캐시를 갱신할 수 있습니다. 실제 API를 추가하면 최신 이력 갱신에는 네트워크가 필요합니다. iOS/Android 실제 기기의 설치 UX는 별도 확인이 필요합니다.

## GitHub Pages와 Actions

현재 origin은 `moganthev/lottogeneration`입니다. 기본 Vite base는 **`/lottogeneration/`** 입니다. 루트나 다른 경로가 필요하면 빌드 시 환경변수로 변경합니다.

```bash
VITE_BASE_PATH=/ npm run build
```

`.github/workflows/deploy.yml`은 다음을 수행합니다.

1. `main` push, `main` 대상 PR, 수동 실행 감지
2. checkout → `.nvmrc`의 Node → `npm ci`
3. Prettier 검사 → lint → Vitest
4. 실제 GitHub repository 이름에서 base를 구성해 데이터 검증·TypeScript 검사·production build
5. Chromium 설치 → Playwright 기능·반응형·오프라인 검사
6. PR이 아닌 경우 공식 `upload-pages-artifact` → `configure-pages` → `deploy-pages`

PR에서는 검증만 실행합니다. 배포 작업에만 `pages: write`와 `id-token: write`를 부여합니다. 실패한 명령은 해당 단계에서 종료되어 테스트나 빌드가 실패한 상태로 배포하지 않습니다. `*.github.io` 저장소는 루트 경로를 사용합니다. 커스텀 도메인을 쓸 때는 base와 Pages 설정을 함께 조정하세요.

**배포 활성화:** 저장소의 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택하세요. 이후 변경사항을 `main`에 반영하면 배포 workflow가 실행됩니다. 실제 배포 성공 여부는 Actions에서 확인하세요. 저장소 권한과 조직 정책에 따라 관리자의 설정이 필요할 수 있습니다.

성공한 배포의 실제 주소는 **Actions → Deploy 작업 → github-pages environment URL**, 또는 **Settings → Pages**에서 확인합니다. 기본 설정일 때 예상 경로는 `https://moganthev.github.io/lottogeneration/`이며, 이 문서는 해당 주소가 이미 게시되었다고 주장하지 않습니다.

## 검증 범위

단위 테스트는 번호 범위·개수·중복·정렬, 고정·제외 충돌과 경계, 유효한 5게임, 좁은 조건의 전체 열거, 개별 재추천, sum/홀짝/저고/구간/연속/끝수/간격/AC/유사도/미출현, 실제 이력 기반 합계 분포, 점수 범위·가중치, Repository 데이터 검증, 연금복권 자리 규칙·빈도·다양성, localStorage 오류 복구를 다룹니다. 모든 랜덤 단위 테스트는 seed를 고정합니다.

Playwright는 전체 사용자 흐름, 개별 재추천에서 4게임 유지, 조건 변경 적용, 탭·결과 복원, 360/390/430/1280px에서 가로 넘침과 번호 배치, production PWA를 완전 오프라인으로 재진입한 뒤 두 복권 추천을 확인합니다. 데이터 무결성 검사 실패 시 추천 비활성화, manifest/icon/JS/CSS 경로, 실제 서비스 워커 업데이트 안내 → 사용자 선택 → 재진입 및 결과 보존도 검사합니다. Chromium 검증이 실제 모든 휴대폰 브라우저의 설치 동작을 보장하지는 않습니다.

## 다음 단계

- 새 회차의 공식 전체 이력 수동 갱신
- 더 많은 seed·조건에서 선택 편향·점수 분포 비교
- 필요할 때 공식 공개 경로를 이용한 검토 가능한 갱신 자동화
- 다양한 모바일 실제 기기의 PWA 설치·업데이트 검사
- 필요하면 사용자가 직접 내보내는 추천 기록, 회차별 데이터 갱신 추가

전체 이력 자동 수집, backend, DB, 로그인, 클라우드 저장, AI API는 구현하지 않았습니다. 이러한 기능 없이 정적 웹앱으로 실행할 수 있습니다.
