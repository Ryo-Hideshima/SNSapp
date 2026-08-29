// タイムライン読み込みの負荷テスト。
// GET /api/posts のオフセットページングを複数ページ読み進める操作と、
// GET /api/posts?sinceId= によるポーリング(実際のフロントエンドが20秒間隔で行うもの)を模擬する。
// N+1回避のLEFT JOIN集計クエリ(いいね数/コメント数/自分のいいね有無)が
// データ量増加でどう劣化するかを見るのが主目的。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';
import { login, authHeaders } from '../scripts/lib/auth.js';

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';
// あらかじめ scripts/seed.js で作成しておいたログイン可能なユーザーを使う
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'perftest_000000@perftest.local';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'password123';

export const options = {
  scenarios: {
    timeline_paging: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:timeline_page}': ['p(95)<500'],
    'http_req_duration{name:timeline_since_id}': ['p(95)<300'],
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
  // 1〜5ページ目を読み進める(無限スクロール相当)
  const page = Math.floor(Math.random() * 5);
  const pageRes = http.get(`${BASE_URL}/api/posts?page=${page}&size=20`, {
    headers: data.headers,
    tags: { name: 'timeline_page' },
  });
  check(pageRes, { 'timeline page: status is 200': (r) => r.status === 200 });

  // 新着ポーリング(実フロントエンドの挙動を模擬)
  const sinceRes = http.get(`${BASE_URL}/api/posts?sinceId=1`, {
    headers: data.headers,
    tags: { name: 'timeline_since_id' },
  });
  check(sinceRes, { 'since id poll: status is 200': (r) => r.status === 200 });

  sleep(1);
}
