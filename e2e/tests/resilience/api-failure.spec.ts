import { test, expect } from '../../fixtures/authenticated-page.js';

test.describe('APIエラー時の表示', () => {
  test('タイムライン取得が失敗した場合、ローディングのまま固まらずエラーメッセージが表示される', async ({
    authenticatedPage: page,
  }) => {
    await page.route('**/api/posts?*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'テスト用に強制させたサーバーエラー' }),
      });
    });

    await page.goto('/timeline');

    await expect(page.locator('.timeline-status--error')).toHaveText('テスト用に強制させたサーバーエラー');
    await expect(page.getByText('読み込み中...')).toHaveCount(0);
  });

  test('プロフィール取得が失敗した場合もエラーメッセージが表示される', async ({ authenticatedPage: page, testUser }) => {
    await page.route(`**/api/users/${testUser.username}`, (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'テスト用に強制させたサーバーエラー' }),
      });
    });

    await page.goto(`/users/${testUser.username}`);

    await expect(page.locator('.timeline-status--error')).toHaveText('テスト用に強制させたサーバーエラー');
  });
});
