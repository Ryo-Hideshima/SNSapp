import { test, expect } from '../../fixtures/authenticated-page.js';

test.describe('投稿の作成・編集・削除', () => {
  // 並行実行される他specも同じタイムラインに投稿するため、「先頭に表示される」ではなく
  // 「タイムラインに表示される」ことのみを検証する(厳密な先頭位置は並行実行下では保証できない)。
  test('投稿を作成するとタイムラインに表示される', async ({ authenticatedPage: page }) => {
    const content = `e2eテスト投稿 ${Date.now()}`;

    await page.getByRole('link', { name: '投稿する' }).click();
    await expect(page).toHaveURL(/\/posts\/new$/);
    await page.getByLabel('本文').fill(content);
    await page.getByRole('button', { name: '投稿する' }).click();

    await expect(page).toHaveURL(/\/timeline$/);
    const ownPost = page.locator('.post-card').filter({ hasText: content });
    await expect(ownPost).toBeVisible();
  });

  test('自分の投稿を編集すると内容が更新される', async ({ authenticatedPage: page }) => {
    const original = `編集前 ${Date.now()}`;
    const edited = `編集後 ${Date.now()}`;

    await page.getByRole('link', { name: '投稿する' }).click();
    await page.getByLabel('本文').fill(original);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    const ownPost = page.locator('.post-card').filter({ hasText: original });
    await ownPost.getByRole('link', { name: '編集', exact: true }).click();
    await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
    const textarea = page.getByLabel('本文');
    await textarea.fill('');
    await textarea.fill(edited);
    await page.getByRole('button', { name: '更新する' }).click();

    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.locator('.post-card').filter({ hasText: edited })).toBeVisible();
  });

  test('自分の投稿を削除すると一覧から消える', async ({ authenticatedPage: page }) => {
    const content = `削除対象の投稿 ${Date.now()}`;

    await page.getByRole('link', { name: '投稿する' }).click();
    await page.getByLabel('本文').fill(content);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    const ownPost = page.locator('.post-card').filter({ hasText: content });
    await expect(ownPost).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await ownPost.getByRole('button', { name: '削除' }).click();

    await expect(page.getByText(content)).toHaveCount(0);
  });
});
