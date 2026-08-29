import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/authenticated-page.js';

async function expectNoSeriousViolations(page: Parameters<typeof AxeBuilder>[0]['page']) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const seriousOrWorse = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  expect(
    seriousOrWorse,
    JSON.stringify(seriousOrWorse.map((v) => ({ id: v.id, help: v.help, nodes: v.nodes.length })), null, 2)
  ).toEqual([]);
}

test.describe('アクセシビリティ', () => {
  test('ログイン画面に重大な違反が無い', async ({ page }) => {
    await page.goto('/login');
    await expectNoSeriousViolations(page);
  });

  test('登録画面に重大な違反が無い', async ({ page }) => {
    await page.goto('/register');
    await expectNoSeriousViolations(page);
  });

  test('タイムライン画面に重大な違反が無い', async ({ authenticatedPage: page }) => {
    await expectNoSeriousViolations(page);
  });

  test('プロフィール画面に重大な違反が無い', async ({ authenticatedPage: page, testUser }) => {
    await page.goto(`/users/${testUser.username}`);
    await expectNoSeriousViolations(page);
  });

  test('検索画面に重大な違反が無い', async ({ authenticatedPage: page }) => {
    await page.goto('/search');
    await expectNoSeriousViolations(page);
  });
});
