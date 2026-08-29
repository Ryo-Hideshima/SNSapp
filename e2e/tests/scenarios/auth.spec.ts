import { test, expect } from '@playwright/test';
import { registerTestUser, uniqueUsername } from '../../fixtures/api.js';

test.describe('認証フロー', () => {
  test('新規登録フォームを送信するとタイムラインへ遷移する', async ({ page }) => {
    const username = uniqueUsername();

    await page.goto('/register');
    await page.getByLabel('ユーザー名（@username）').fill(username);
    await page.getByLabel('メールアドレス').fill(`${username}@e2e.local`);
    await page.getByLabel('パスワード（8文字以上）').fill('password123');
    await page.getByRole('button', { name: '登録する' }).click();

    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByRole('link', { name: `@${username}` })).toBeVisible();
  });

  test('ログインするとタイムラインへ遷移する', async ({ page }) => {
    const user = await registerTestUser();

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill(user.password);
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL(/\/timeline$/);
  });

  test('誤ったパスワードでログインするとエラーメッセージが表示される', async ({ page }) => {
    const user = await registerTestUser();

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill('wrong-password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page.locator('.form-error')).not.toBeEmpty();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('ログアウト後は保護ページへのアクセスでログイン画面へリダイレクトされる', async ({ page }) => {
    const user = await registerTestUser();

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill(user.password);
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/timeline');
    await expect(page).toHaveURL(/\/login$/);
  });
});
