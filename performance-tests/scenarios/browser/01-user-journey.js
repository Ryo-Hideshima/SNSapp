// 実ブラウザ(Chromium)でReact SPAを操作し、
// ログイン → タイムライン閲覧(無限スクロール) → 投稿作成 → いいね
// という一連のユーザー行動を再現する。
// APIを直接叩くだけでは見えない、フロントエンドのレンダリング・JSバンドル読み込み・
// ブラウザ側の処理コストまで含めた体感速度を計測するのが目的。
//
// ブラウザ起動はプロセスコストが高いため、VU数(同時ブラウザ数)は
// APIシナリオよりずっと少なめにする(既定5)。
//
// 実行例:
//   k6 run performance-tests/scenarios/browser/01-user-journey.js
import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { assertLocalTarget, FRONTEND_URL } from '../../scripts/lib/config.js';
import http from 'k6/http';
import { BASE_URL } from '../../scripts/lib/config.js';

const VUS = parseInt(__ENV.VUS || '5', 10);
const ITERATIONS = parseInt(__ENV.ITERATIONS || '5', 10);

export const options = {
  scenarios: {
    ui_journey: {
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERATIONS,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
    browser_web_vital_lcp: ['p(75)<2500'], // Core Web VitalsのLCP「良好」ライン
  },
};

export function setup() {
  assertLocalTarget();

  // このVUで使うユーザーをあらかじめAPI経由で登録しておく(UI上の新規登録操作は対象外にし、
  // ログイン以降の体感速度計測に集中する)
  const users = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const username = `perftest_ui_${i}_${Date.now()}`;
    const email = `${username}@perftest.local`;
    const password = 'password123';
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ username, email, password, displayName: username }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 201) {
      users.push({ email, password });
    }
  }
  return { users };
}

export default async function (data) {
  const user = data.users[__ITER % data.users.length];
  if (!user) return;

  const page = await browser.newPage();
  try {
    // 1. ログイン
    await page.goto(`${FRONTEND_URL}/login`);
    await page.locator('#email').type(user.email);
    await page.locator('#password').type(user.password);
    await Promise.all([page.waitForNavigation(), page.locator('button[type="submit"]').click()]);

    check(page, {
      'ログイン後にタイムラインへ遷移': (p) => p.url().includes('/timeline'),
    });

    // 2. タイムラインを下にスクロールして無限スクロールを発火させる
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }

    // 3. 投稿を作成する
    await page.goto(`${FRONTEND_URL}/posts/new`);
    await page.locator('#content').type(`k6ブラウザシナリオからの投稿 ${Date.now()}`);
    await Promise.all([page.waitForNavigation(), page.locator('button[type="submit"]').click()]);

    check(page, {
      '投稿後にタイムラインへ戻る': (p) => p.url().includes('/timeline'),
    });

    // 4. 先頭の投稿にいいねする
    const likeButton = page.locator('.post-card__like-btn').first();
    if (await likeButton.count() > 0) {
      await likeButton.click();
      await page.waitForTimeout(300);
    }
  } finally {
    await page.close();
  }

  sleep(1);
}
