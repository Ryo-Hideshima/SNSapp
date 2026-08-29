// 投稿の作成/更新/削除の負荷テスト(書き込み系のスループットとDBコネクションプールの様子を見る)。
// 各VUは専用のユーザーを新規登録してから、自分の投稿だけを作成・更新・削除する
// (他ユーザーの投稿を操作すると403になり負荷テストとして無意味なため)。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';
import { authHeaders } from '../scripts/lib/auth.js';

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    post_write: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:post_create}': ['p(95)<500'],
    'http_req_duration{name:post_update}': ['p(95)<500'],
    'http_req_duration{name:post_delete}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  assertLocalTarget();
}

// VUごとに一度だけユーザーを用意する(k6のexecグローバルは使わずVU内変数でキャッシュ)
let cachedUser = null;

function ensureUser() {
  if (cachedUser) return cachedUser;

  const username = `perftest_w${__VU}_${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      username,
      email: `${username}@perftest.local`,
      password: 'password123',
      displayName: username,
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_register' } }
  );
  check(res, { 'write-vu register: status is 201': (r) => r.status === 201 });
  cachedUser = { headers: authHeaders(res.json('accessToken')) };
  return cachedUser;
}

export default function () {
  const user = ensureUser();

  const createRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify({ content: `load test post ${Date.now()}` }),
    { headers: user.headers, tags: { name: 'post_create' } }
  );
  check(createRes, { 'post create: status is 201': (r) => r.status === 201 });
  if (createRes.status !== 201) return;

  const postId = createRes.json('id');

  const updateRes = http.put(
    `${BASE_URL}/api/posts/${postId}`,
    JSON.stringify({ content: `updated content ${Date.now()}` }),
    { headers: user.headers, tags: { name: 'post_update' } }
  );
  check(updateRes, { 'post update: status is 200': (r) => r.status === 200 });

  const deleteRes = http.del(`${BASE_URL}/api/posts/${postId}`, null, {
    headers: user.headers,
    tags: { name: 'post_delete' },
  });
  check(deleteRes, { 'post delete: status is 204': (r) => r.status === 204 });

  sleep(1);
}
