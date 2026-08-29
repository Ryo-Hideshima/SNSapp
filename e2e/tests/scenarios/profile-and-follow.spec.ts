import { test, expect } from '../../fixtures/authenticated-page.js';
import { registerTestUser } from '../../fixtures/api.js';

test.describe('プロフィール編集とフォロー', () => {
  test('自分のプロフィールで表示名と自己紹介を編集できる', async ({ authenticatedPage: page, testUser }) => {
    const newDisplayName = `編集後の名前 ${Date.now()}`;
    const newBio = `自己紹介を更新しました ${Date.now()}`;

    await page.goto(`/users/${testUser.username}`);
    await page.getByRole('button', { name: 'プロフィールを編集' }).click();

    const displayNameInput = page.getByLabel('表示名');
    await displayNameInput.fill('');
    await displayNameInput.fill(newDisplayName);
    await page.getByLabel('自己紹介').fill(newBio);
    await page.getByRole('button', { name: '保存する' }).click();

    await expect(page.locator('.profile-header__name')).toHaveText(newDisplayName);
    await expect(page.locator('.profile-header__bio')).toHaveText(newBio);
  });

  test('他ユーザーのプロフィールでフォロー/フォロー解除ができる', async ({ authenticatedPage: page }) => {
    const other = await registerTestUser();

    await page.goto(`/users/${other.username}`);
    const followButton = page.getByRole('button', { name: 'フォローする' });
    await expect(followButton).toBeVisible();

    await followButton.click();
    await expect(page.getByRole('button', { name: 'フォロー中' })).toBeVisible();

    await page.getByRole('button', { name: 'フォロー中' }).click();
    await expect(page.getByRole('button', { name: 'フォローする' })).toBeVisible();
  });

  test('フォロー後にフォロー中一覧へ遷移すると相手が表示される', async ({ authenticatedPage: page, testUser }) => {
    const other = await registerTestUser();

    await page.goto(`/users/${other.username}`);
    await page.getByRole('button', { name: 'フォローする' }).click();
    await expect(page.getByRole('button', { name: 'フォロー中' })).toBeVisible();

    await page.goto(`/users/${testUser.username}`);
    await page.getByRole('link', { name: /フォロー中$/ }).click();

    await expect(page).toHaveURL(new RegExp(`/users/${testUser.username}/following$`));
    await expect(page.getByText(`@${other.username}`)).toBeVisible();
  });
});
