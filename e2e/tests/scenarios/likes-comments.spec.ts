import { test, expect } from '../../fixtures/authenticated-page.js';
import { createTestPost } from '../../fixtures/api.js';

test.describe('いいね・コメント', () => {
  test('投稿詳細でいいねをトグルできる', async ({ authenticatedPage: page, testUser }) => {
    const post = await createTestPost(testUser, `いいねテスト投稿 ${Date.now()}`);

    await page.goto(`/posts/${post.id}`);
    const likeButton = page.getByRole('button', { name: /^♡ 0$/ });
    await expect(likeButton).toBeVisible();

    await likeButton.click();
    await expect(page.getByRole('button', { name: /^❤ 1$/ })).toBeVisible();

    await page.getByRole('button', { name: /^❤ 1$/ }).click();
    await expect(page.getByRole('button', { name: /^♡ 0$/ })).toBeVisible();
  });

  test('コメントを投稿すると一覧に反映され、削除もできる', async ({ authenticatedPage: page, testUser }) => {
    const post = await createTestPost(testUser, `コメントテスト投稿 ${Date.now()}`);
    const commentContent = `e2eコメント ${Date.now()}`;

    await page.goto(`/posts/${post.id}`);
    await expect(page.getByText('まだコメントはありません。')).toBeVisible();

    await page.getByLabel('コメントする').fill(commentContent);
    await page.getByRole('button', { name: 'コメントする' }).click();

    const commentCard = page.locator('.comment-card').filter({ hasText: commentContent });
    await expect(commentCard).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await commentCard.getByRole('button', { name: '削除' }).click();

    await expect(page.getByText(commentContent)).toHaveCount(0);
  });
});
