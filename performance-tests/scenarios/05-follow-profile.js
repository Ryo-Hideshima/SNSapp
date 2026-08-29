// プロフィール取得とフォロー/フォロー解除トグルの負荷テスト。
// UserMapper.findProfileByUsername(フォロー中数・フォロワー数・自分がフォロー済みかを
// LEFT JOIN集計で1クエリ取得)がデータ量増加でどう劣化するかを見る。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';
import { login, authHeaders } from '../scripts/lib/auth.js';

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'perftest_000000@perftest.local';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'password123';
// seed-relations.jsで作られるユーザーの範囲。多いほどプロフィール先が分散する
const TARGET_USER_COUNT = parseInt(__ENV.TARGET_USER_COUNT || '200', 10);

export const options = {
  scenarios: {
    follow_profile: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:profile_get}': ['p(95)<400'],
    'http_req_duration{name:follow_toggle}': ['p(95)<400'],
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

function randomRelationUsername() {
  const index = Math.floor(Math.random() * TARGET_USER_COUNT);
  return `perftest_r${String(index).padStart(6, '0')}`;
}

export default function (data) {
  // target未存在時の404、自己フォロー時の400は正常系として扱うため、
  // http_req_failedの母数から除外する(setup()側で設定してもVUごとの実行には反映されないため、
  // 各VUのdefault関数側で設定する必要がある)
  http.setResponseCallback(http.expectedStatuses(200, 400, 404));

  const target = randomRelationUsername();

  const profileRes = http.get(`${BASE_URL}/api/users/${target}`, {
    headers: data.headers,
    tags: { name: 'profile_get' },
  });
  check(profileRes, { 'profile: status is 200 or 404': (r) => r.status === 200 || r.status === 404 });

  const followRes = http.post(`${BASE_URL}/api/users/${target}/follow`, null, {
    headers: data.headers,
    tags: { name: 'follow_toggle' },
  });
  check(followRes, { 'follow toggle: status is 200 or 400 or 404': (r) => [200, 400, 404].includes(r.status) });

  sleep(1);
}
