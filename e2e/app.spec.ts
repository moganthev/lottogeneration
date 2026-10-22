import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import expectedHistoryDocument from '../src/features/lotto/data/lotto-history.json' with { type: 'json' };

const expectedHistory = expectedHistoryDocument.metadata;

test('full lotto workflow, settings conflicts, reroll and device persistence', async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('./');
  await expect(page.locator('.data-notice')).toContainText(
    `분석 데이터 ${expectedHistory.firstDraw.toLocaleString('ko-KR')}회 ~ ${expectedHistory.latestDraw.toLocaleString('ko-KR')}회`,
  );
  await page.getByRole('button', { name: '7번 고정', exact: true }).click();
  await page.getByRole('button', { name: '제외 0', exact: true }).click();
  await page.getByRole('button', { name: '7번 제외', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('겹칩니다');
  await page.getByRole('button', { name: '44번 제외', exact: true }).click();
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.locator('.game-card')).toHaveCount(5);
  const readGames = () =>
    page
      .locator('.game-card .balls')
      .evaluateAll((items) =>
        items.map((item) =>
          [...item.querySelectorAll('.ball')].map((ball) =>
            Number(ball.textContent),
          ),
        ),
      );
  const original = await readGames();
  expect(
    original.every(
      (game) => game.length === 6 && game.includes(7) && !game.includes(44),
    ),
  ).toBe(true);
  await page
    .locator('.game-card')
    .first()
    .getByText('분석 보기', { exact: true })
    .click();
  await expect(page.locator('.analysis-grid').first()).toBeVisible();
  await page
    .getByRole('button', { name: 'GAME 1 다시 추천', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('GAME 1을 새 번호로');
  const next = await readGames();
  expect(next[0]).not.toEqual(original[0]);
  expect(next.slice(1)).toEqual(original.slice(1));
  await page.reload();
  await expect(page.locator('.game-card')).toHaveCount(5);
  expect(await readGames()).toEqual(next);
  await expect(
    page.getByRole('button', { name: '7번 고정', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(runtimeErrors).toEqual([]);
});

test('changing conditions requires a full recommendation and preserves existing games', async ({
  page,
}) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.locator('.game-card')).toHaveCount(5);
  await page.getByRole('button', { name: '21번 고정', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'GAME 1 다시 추천', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('새로운 5게임');
  await expect(page.locator('.ball-fixed')).toHaveCount(5);
});

test('pension tab returns five valid tickets and restores the last tab', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('tab', { name: '연금복권' }).click();
  await page
    .getByRole('button', { name: '연금복권 번호 추천', exact: true })
    .click();
  await expect(page.locator('.pension-card')).toHaveCount(5);
  const numbers = await page.locator('.pension-digits').allTextContents();
  expect(numbers.every((number) => /^\d{6}$/.test(number))).toBe(true);
  expect(new Set(numbers).size).toBe(5);
  await page.reload();
  await expect(page.getByRole('tab', { name: '연금복권' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.pension-card')).toHaveCount(5);
  await expect(
    page.getByText('1~5조, 000000~999999.', {
      exact: false,
    }),
  ).toBeVisible();
});

test('mobile number settings work before recommending', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
  await page.locator('.mobile-settings > summary').click();
  await page.getByRole('button', { name: '21번 고정', exact: true }).click();
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.locator('.ball-fixed')).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('tabs and install help work with the keyboard', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: '로또 6/45' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '연금복권' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: '로또 6/45' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: '앱 설치 안내' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '확인했어요' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: '앱 설치 안내' }),
  ).toBeFocused();
});

for (const width of [360, 390, 430, 1280]) {
  test(`no horizontal overflow and all six balls fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page
      .getByRole('button', { name: '5게임 추천받기', exact: true })
      .click();
    await expect(page.locator('.game-card')).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const fit = await page.locator('.game-main').evaluateAll((rows) =>
      rows.every((row) => {
        const container = row.getBoundingClientRect();
        return [...row.querySelectorAll('.ball, button')].every((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.left >= container.left && rect.right <= container.right + 1
          );
        });
      }),
    );
    expect(fit).toBe(true);
    await page.getByRole('tab', { name: '연금복권' }).click();
    await page
      .getByRole('button', { name: '연금복권 번호 추천', exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test('installed service worker serves the app and recommendation worker offline', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    serviceWorkers: 'allow',
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  const basePath = new URL(baseURL!).pathname;
  expect(manifestUrl).toContain(basePath);
  const manifest = await (await page.request.get(manifestUrl!)).json();
  expect(manifest.name).toBe('LottoGeneration');
  expect(manifest.start_url).toBe(basePath);
  expect(manifest.scope).toBe(basePath);
  for (const icon of manifest.icons as { src: string }[]) {
    const url = new URL(icon.src, new URL(manifestUrl!, baseURL));
    expect(url.pathname.startsWith(basePath)).toBe(true);
    const response = await page.request.get(url.toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  const assetPaths = await page
    .locator('script[src], link[rel="stylesheet"]')
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          element.getAttribute('src') ?? element.getAttribute('href'),
      ),
    );
  expect(assetPaths.every((path) => path?.startsWith(basePath))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '오늘의 추천 번호' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.locator('.game-card')).toHaveCount(5);
  await page.getByRole('tab', { name: '연금복권' }).click();
  await page
    .getByRole('button', { name: '연금복권 번호 추천', exact: true })
    .click();
  await expect(page.locator('.pension-card')).toHaveCount(5);
  await context.close();
});

test('a history verification error disables lotto without a synthetic fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto.subtle, 'digest', {
      value: () => Promise.reject(new Error('data verification failed')),
    });
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('로또 추천이 비활성화');
  await expect(
    page.getByRole('button', { name: '5게임 추천받기', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.game-card')).toHaveCount(0);
  await page.getByRole('tab', { name: '연금복권' }).click();
  await page
    .getByRole('button', { name: '연금복권 번호 추천', exact: true })
    .click();
  await expect(page.locator('.pension-card')).toHaveCount(5);
});

test('PWA update is offered, activated on request and retains stored games', async ({
  page,
}) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page
    .getByRole('button', { name: '5게임 추천받기', exact: true })
    .click();
  await expect(page.locator('.game-card')).toHaveCount(5);
  const before = await page.locator('.balls').allTextContents();
  const serviceWorker = await readFile('dist/sw.js', 'utf8');
  try {
    // Change the built artifact only to simulate a new deployment; restore exact bytes below.
    await writeFile(
      'dist/sw.js',
      `${serviceWorker}\n// browser-update-check-${Date.now()}\n`,
    );
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(page.getByText('새 버전이 준비됐어요.')).toBeVisible();
    const navigation = page.waitForEvent('load');
    await page.getByRole('button', { name: '업데이트', exact: true }).click();
    await navigation;
    await expect(page.locator('.game-card')).toHaveCount(5);
    expect(await page.locator('.balls').allTextContents()).toEqual(before);
    await expect(page.getByText('새 버전이 준비됐어요.')).not.toBeVisible();
  } finally {
    await writeFile('dist/sw.js', serviceWorker);
  }
});
