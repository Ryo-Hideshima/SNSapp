import { test, expect } from '@playwright/test';
import { registerTestUser } from '../../fixtures/api.js';

test.describe('セッション期限切れの挙動', () => {
  test('無効なアクセストークン+無効なリフレッシュトークンの場合、APIアクセス時に自動でログイン画面へ戻される', async ({
    page,
  }) => {
    const user = await registerTestUser();
    const storedUser = { userId: user.userId, username: user.username, displayName: user.displayName };

    // sns_userは存在する(=マウント直後はisLoggedIn=trueとして保護ページに入れる)が、
    // アクセストークン・リフレッシュトークンの両方が無効な状態を再現する。
    // これによりTimelinePageのAPI呼び出しが401→authFetchのリフレッシュ試行→失敗、という
    // 実際のブラウザでのフローを検証する(frontend/src/api/client.tsのauthFetch)。
    await page.addInitScript((data) => {
      window.localStorage.setItem('sns_access_token', 'invalid-access-token');
      window.localStorage.setItem('sns_refresh_token', 'invalid-refresh-token');
      window.localStorage.setItem('sns_user', JSON.stringify(data.user));
    }, { user: storedUser });

    await page.goto('/timeline');

    // 直後は(sns_userがあるため)保護ページに入れるが、APIの401→リフレッシュ失敗を経て
    // 最終的にログイン画面へリダイレクトされる
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });

  test('トークンが一切無い状態で保護ページへ直接アクセスすると即座にログイン画面へ遷移する', async ({ page }) => {
    await page.goto('/timeline');
    await expect(page).toHaveURL(/\/login$/);
  });
});
