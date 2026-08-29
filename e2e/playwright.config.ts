import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['list']],
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // フロントエンドのdev serverは無ければ自動起動、既に起動していればそのまま使う。
  // バックエンド(Spring Boot)+PostgreSQLはJavaプロセス起動の複雑さを踏まえ
  // 自動起動の対象外。README記載の手順で事前に起動しておくこと。
  webServer: {
    command: 'npm run dev',
    cwd: '../frontend',
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 最重要フロー(認証・投稿)だけをクロスブラウザでスモーク確認する軽量プロジェクト
      name: 'firefox-smoke',
      testMatch: ['scenarios/auth.spec.ts', 'scenarios/posting.spec.ts'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      testMatch: ['scenarios/auth.spec.ts', 'scenarios/posting.spec.ts'],
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
