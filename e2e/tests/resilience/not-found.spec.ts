import { test, expect } from '../../fixtures/authenticated-page.js';

test.describe('存在しないリソースへのアクセス', () => {
  test('存在しないユーザー名のプロフィールはエラーメッセージを表示する', async ({ authenticatedPage: page }) => {
    await page.goto('/users/no_such_user_zzz');

    await expect(page.locator('.timeline-status--error')).toHaveText('ユーザーが見つかりません。');
  });

  test('存在しない投稿IDはエラーメッセージを表示する', async ({ authenticatedPage: page }) => {
    await page.goto('/posts/999999999');

    await expect(page.locator('.timeline-status--error')).toHaveText('投稿が見つかりません。');
  });
});
