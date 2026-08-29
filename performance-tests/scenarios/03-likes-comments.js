// 少数の「人気投稿」に対する同時いいね/コメントの負荷テスト。
// いいねはON CONFLICT DO NOTHINGによる冪等insertのため、同じユーザーが同じ投稿に
// 同時に何度もリクエストしても1行しか作られないはず、というのを競合下で検証する。
// あらかじめ対象投稿を1件作っておき(setup)、全VUがそれに向かって集中的にいいね/コメントする。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';
import { authHeaders } from '../scripts/lib/auth.js';

const VUS = parseInt(__ENV.VUS || '50', 10);
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    hot_post_engagement: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:like_toggle}': ['p(95)<400'],
    'http_req_duration{name:comment_create}': ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  assertLocalTarget();

  // 「人気投稿」の作者を1人作り、投稿を1件作成する
  const username = `perftest_hotpost_author_${Date.now()}`;
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      username,
      email: `${username}@perftest.local`,
      password: 'password123',
      displayName: username,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const authorHeaders = authHeaders(registerRes.json('accessToken'));

  const postRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify({ content: 'この投稿に負荷テストのいいね/コメントが集中します' }),
    { headers: authorHeaders }
  );

  return { hotPostId: postRes.json('id') };
}

let cachedUser = null;

function ensureUser() {
  if (cachedUser) return cachedUser;
  const username = `perftest_engager_${__VU}_${Date.now()}`;
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
  cachedUser = { headers: authHeaders(res.json('accessToken')) };
  return cachedUser;
}

export default function (data) {
  const user = ensureUser();

  // 同じ投稿に対して何度もいいねをトグルする(ON CONFLICT DO NOTHINGの冪等性を競合下で確認)
  const likeRes = http.post(`${BASE_URL}/api/posts/${data.hotPostId}/likes`, null, {
    headers: user.headers,
    tags: { name: 'like_toggle' },
  });
  check(likeRes, { 'like: status is 200': (r) => r.status === 200 });

  const commentRes = http.post(
    `${BASE_URL}/api/posts/${data.hotPostId}/comments`,
    JSON.stringify({ content: `load test comment ${Date.now()}` }),
    { headers: user.headers, tags: { name: 'comment_create' } }
  );
  check(commentRes, { 'comment: status is 201': (r) => r.status === 201 });

  sleep(0.5);
}
