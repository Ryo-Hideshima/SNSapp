// ユーザー検索の負荷テスト。
// GET /api/users?q= は LOWER(username) LIKE LOWER('%keyword%') という
// 先頭ワイルドカードのLIKE検索で、B-treeインデックスが効かない想定のクエリ。
// データ量が増えるほど他のエンドポイントより早く劣化する可能性が高いため、
// 重点的に計測する。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';
import { login, authHeaders } from '../scripts/lib/auth.js';

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'perftest_000000@perftest.local';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'password123';

// seed.js/seed-relations.jsで作られるユーザー名の断片からランダムに検索する
const KEYWORDS = ['perftest', 'perftest_r', '000', '001', '1', '2', 'a'];

export const options = {
  scenarios: {
    user_search: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:user_search}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  assertLocalTarget();
  const auth = login(LOGIN_EMAIL, LOGIN_PASSWORD);
  if (!auth) {
    throw new Error(
      `ログインに失敗しました(${LOGIN_EMAIL})。先に scripts/seed.js でユーザーを作成してください。`
    );
  }
  return { headers: authHeaders(auth.accessToken) };
}

export default function (data) {
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  const res = http.get(`${BASE_URL}/api/users?q=${encodeURIComponent(keyword)}`, {
    headers: data.headers,
    tags: { name: 'user_search' },
  });
  check(res, { 'search: status is 200': (r) => r.status === 200 });

  sleep(1);
}
