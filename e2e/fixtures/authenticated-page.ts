// ログイン済み状態のpageを提供するカスタムfixture。
// API経由で登録したユーザーのトークンをlocalStorageに直接注入することで、
// 毎回ログインフォームを操作せずに済む(ログインフォーム自体の検証はscenarios/auth.spec.tsで行う)。
import { test as base, type Page } from '@playwright/test';
import { registerTestUser, type TestUser } from './api.js';

interface AuthFixtures {
  testUser: TestUser;
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    const user = await registerTestUser();
    await use(user);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    const storedUser = {
      userId: testUser.userId,
      username: testUser.username,
      displayName: testUser.displayName,
    };

    // AuthContextはマウント時にlocalStorageを同期的に読むため、
    // 実際のページスクリプトが動く前に注入する必要がありaddInitScriptを使う
    await page.addInitScript((data) => {
      window.localStorage.setItem('sns_access_token', data.accessToken);
      window.localStorage.setItem('sns_refresh_token', data.refreshToken);
      window.localStorage.setItem('sns_user', JSON.stringify(data.user));
    }, { accessToken: testUser.accessToken, refreshToken: testUser.refreshToken, user: storedUser });

    await page.goto('/timeline');
    await use(page);
  },
});

export { expect } from '@playwright/test';
