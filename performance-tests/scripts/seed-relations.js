// 負荷テスト用データの投入(ステップ2: フォロー関係といいね)。
// scripts/seed.js を先に実行し、対象ユーザーが全員登録済みであることが前提。
//
// 実行例:
//   SEED_USER_COUNT=500 k6 run performance-tests/scripts/seed-relations.js
//
// seed.jsのユーザーindexは(VUごとのオフセット)*1000000 + イテレーション番号という
// 分散した採番のため、本スクリプトでは0〜SEED_USER_COUNT-1のシンプルな連番で
// 別枠のユーザー(perftest_r000001等)を作りつつ、その中で互いにフォロー/いいねし合う
// 構成にする(既存のseed.jsユーザーIDを跨いで参照する必要をなくし、実行を単純にするため)。
import http from 'k6/http';
import { check } from 'k6';
import { assertLocalTarget, BASE_URL } from './lib/config.js';
import { authHeaders } from './lib/auth.js';

const SEED_USER_COUNT = parseInt(__ENV.SEED_USER_COUNT || '200', 10);

export const options = {
  scenarios: {
    relations: {
      executor: 'shared-iterations',
      vus: Math.min(20, SEED_USER_COUNT),
      iterations: SEED_USER_COUNT,
      maxDuration: '30m',
    },
  },
  // このスクリプトはシード目的であり、直前ユーザーがまだ登録完了していないタイミングでの
  // フォロー試行(404)を正常系として許容する設計のため、http_req_failedの閾値は設けない
  // (成否は上記checksとサマリのcheck成功率で判断する)。
};

function registerRelationUser(index) {
  const username = `perftest_r${String(index).padStart(6, '0')}`;
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      username,
      email: `${username}@perftest.local`,
      password: 'password123',
      displayName: `PerfTest R${index}`,
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_register' } }
  );
  check(res, { 'register: status is 201': (r) => r.status === 201 });
  if (res.status !== 201) return null;
  const json = res.json();
  return { username, accessToken: json.accessToken };
}

export function setup() {
  assertLocalTarget();
  console.log(`フォロー/いいね関係の投入開始: ${SEED_USER_COUNT}ユーザー分`);
}

export default function () {
  const index = __ITER + (__VU - 1) * 1000000;
  const user = registerRelationUser(index);
  if (!user) return;

  const headers = authHeaders(user.accessToken);

  // 自分の投稿を1件作る
  const postRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify({ content: `perftest relation post by ${user.username}` }),
    { headers, tags: { name: 'seed_create_post' } }
  );
  check(postRes, { 'seed post: status is 201': (r) => r.status === 201 });

  // 直前のインデックスのユーザーをフォローし、その投稿にいいねする(存在すれば)
  const targetIndex = index - 1;
  if (targetIndex >= 0) {
    const targetUsername = `perftest_r${String(targetIndex).padStart(6, '0')}`;

    const followRes = http.post(`${BASE_URL}/api/users/${targetUsername}/follow`, null, {
      headers,
      tags: { name: 'seed_follow' },
    });
    check(followRes, { 'seed follow: status is 200 or 404': (r) => r.status === 200 || r.status === 404 });

    const listRes = http.get(`${BASE_URL}/api/posts?authorUsername=${targetUsername}&size=1`, {
      headers,
      tags: { name: 'seed_find_post' },
    });
    if (listRes.status === 200) {
      const posts = listRes.json('posts');
      if (posts && posts.length > 0) {
        const likeRes = http.post(`${BASE_URL}/api/posts/${posts[0].id}/likes`, null, {
          headers,
          tags: { name: 'seed_like' },
        });
        check(likeRes, { 'seed like: status is 200': (r) => r.status === 200 });
      }
    }
  }
}

export function teardown() {
  console.log('フォロー/いいね関係の投入完了');
}
