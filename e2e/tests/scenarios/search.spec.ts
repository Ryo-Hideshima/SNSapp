import { test, expect } from '../../fixtures/authenticated-page.js';
import { registerTestUser } from '../../fixtures/api.js';

test.describe('ユーザー検索', () => {
  test('キーワード検索で結果が表示され、プロフィールへ遷移できる', async ({ authenticatedPage: page }) => {
    const target = await registerTestUser(`検索対象ユーザー ${Date.now()}`);

    await page.getByRole('link', { name: '検索' }).click();
    await expect(page).toHaveURL(/\/search$/);

    await page.getByPlaceholder('ユーザー名または表示名で検索').fill(target.username);
    await page.getByRole('button', { name: '検索' }).click();

    const resultRow = page.locator('.user-row').filter({ hasText: `@${target.username}` });
    await expect(resultRow).toBeVisible();

    await resultRow.getByRole('link', { name: target.displayName }).click();
    await expect(page).toHaveURL(new RegExp(`/users/${target.username}$`));
  });

  test('検索結果からフォローできる', async ({ authenticatedPage: page }) => {
    const target = await registerTestUser();

    await page.goto('/search');
    await page.getByPlaceholder('ユーザー名または表示名で検索').fill(target.username);
    await page.getByRole('button', { name: '検索' }).click();

    const resultRow = page.locator('.user-row').filter({ hasText: `@${target.username}` });
    await resultRow.getByRole('button', { name: 'フォローする' }).click();

    await expect(resultRow.getByRole('button', { name: 'フォロー中' })).toBeVisible();
  });

  test('該当なしの場合はメッセージが表示される', async ({ authenticatedPage: page }) => {
    await page.goto('/search');
    await page.getByPlaceholder('ユーザー名または表示名で検索').fill('zzz_no_such_user_zzz');
    await page.getByRole('button', { name: '検索' }).click();

    await expect(page.getByText('該当するユーザーが見つかりませんでした。')).toBeVisible();
  });
});
