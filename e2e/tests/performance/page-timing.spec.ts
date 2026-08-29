import { expect, test } from '../../fixtures/authenticated-page.js';

interface WebVitals {
  lcp: number | null;
  cls: number;
  maxEventDelay: number | null;
}

interface NavigationTiming {
  ttfb: number;
  domContentLoaded: number;
  load: number;
}

/**
 * PerformanceObserverでLCP/CLS/イベント遅延(INP相当)を収集するスクリプトを
 * ナビゲーション前に仕込み、window上に結果を溜めておく。
 * ライブラリを使わず生のPerformance APIのみで計測する。
 */
async function installWebVitalsCollector(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vitals: WebVitalsInternal };
    interface WebVitalsInternal {
      lcp: number | null;
      cls: number;
      maxEventDelay: number | null;
    }
    w.__vitals = { lcp: null, cls: 0, maxEventDelay: null };

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) w.__vitals.lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // LCP未対応ブラウザは無視
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) {
          if (!entry.hadRecentInput) w.__vitals.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // CLS未対応ブラウザは無視
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { duration: number }[]) {
          if (w.__vitals.maxEventDelay === null || entry.duration > w.__vitals.maxEventDelay) {
            w.__vitals.maxEventDelay = entry.duration;
          }
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {
      // Event Timing未対応ブラウザは無視
    }
  });
}

async function readWebVitals(page: import('@playwright/test').Page): Promise<WebVitals> {
  return page.evaluate(() => (window as unknown as { __vitals: WebVitals }).__vitals);
}

async function readNavigationTiming(page: import('@playwright/test').Page): Promise<NavigationTiming> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      load: nav.loadEventEnd - nav.startTime,
    };
  });
}

// Core Web Vitalsの「良好」ラインを目安にした緩めの閾値(ローカル開発環境でのばらつきを考慮)
const BUDGETS = {
  ttfb: 800,
  domContentLoaded: 3000,
  load: 5000,
  lcp: 2500,
  cls: 0.1,
};

test.describe('ブラウザパフォーマンス計測', () => {
  test('タイムライン画面の読み込み性能', async ({ authenticatedPage: page }) => {
    await installWebVitalsCollector(page);
    await page.goto('/timeline', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const nav = await readNavigationTiming(page);
    const vitals = await readWebVitals(page);

    console.log('[performance] timeline', { nav, vitals });

    expect(nav.ttfb).toBeLessThan(BUDGETS.ttfb);
    expect(nav.domContentLoaded).toBeLessThan(BUDGETS.domContentLoaded);
    expect(nav.load).toBeLessThan(BUDGETS.load);
    if (vitals.lcp !== null) expect(vitals.lcp).toBeLessThan(BUDGETS.lcp);
    expect(vitals.cls).toBeLessThan(BUDGETS.cls);
  });

  test('プロフィール画面の読み込み性能', async ({ authenticatedPage: page, testUser }) => {
    await installWebVitalsCollector(page);
    await page.goto(`/users/${testUser.username}`, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const nav = await readNavigationTiming(page);
    const vitals = await readWebVitals(page);

    console.log('[performance] profile', { nav, vitals });

    expect(nav.ttfb).toBeLessThan(BUDGETS.ttfb);
    expect(nav.domContentLoaded).toBeLessThan(BUDGETS.domContentLoaded);
    expect(nav.load).toBeLessThan(BUDGETS.load);
    if (vitals.lcp !== null) expect(vitals.lcp).toBeLessThan(BUDGETS.lcp);
    expect(vitals.cls).toBeLessThan(BUDGETS.cls);
  });

  test('検索画面の読み込み性能', async ({ authenticatedPage: page }) => {
    await installWebVitalsCollector(page);
    await page.goto('/search', { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const nav = await readNavigationTiming(page);
    const vitals = await readWebVitals(page);

    console.log('[performance] search', { nav, vitals });

    expect(nav.ttfb).toBeLessThan(BUDGETS.ttfb);
    expect(nav.domContentLoaded).toBeLessThan(BUDGETS.domContentLoaded);
    expect(nav.load).toBeLessThan(BUDGETS.load);
    if (vitals.lcp !== null) expect(vitals.lcp).toBeLessThan(BUDGETS.lcp);
    expect(vitals.cls).toBeLessThan(BUDGETS.cls);
  });
});
