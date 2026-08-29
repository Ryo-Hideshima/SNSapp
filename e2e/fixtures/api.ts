// バックエンドAPIを直接叩いてe2e_プレフィックス付きのテストユーザーを用意するヘルパー。
// UI経由の登録フォームより高速・安定なため、ログイン状態を前提とする大半のspecはこちらを使い、
// 登録フォーム自体の検証はscenarios/auth.spec.tsでのみUI操作を行う。
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

export interface TestUser {
  username: string;
  email: string;
  password: string;
  displayName: string;
  userId: number;
  accessToken: string;
  refreshToken: string;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** username LIKE 'e2e_%' でglobal-teardownが確実に拾えるプレフィックス付きの一意な名前を生成する */
export function uniqueUsername(): string {
  return `e2e_${Date.now().toString(36)}_${randomSuffix()}`;
}

export async function registerTestUser(displayName?: string): Promise<TestUser> {
  const username = uniqueUsername();
  const email = `${username}@e2e.local`;
  const password = 'password123';

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, displayName: displayName ?? username }),
  });

  if (!res.ok) {
    throw new Error(`テストユーザーの登録に失敗しました: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { userId: number; accessToken: string; refreshToken: string };
  return {
    username,
    email,
    password,
    displayName: displayName ?? username,
    userId: json.userId,
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
  };
}

export async function createTestPost(user: TestUser, content: string): Promise<{ id: number }> {
  const res = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(`テスト投稿の作成に失敗しました: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { id: number };
}
