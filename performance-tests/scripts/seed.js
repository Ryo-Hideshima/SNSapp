// 負荷テスト用データの投入(ステップ1: ユーザー登録 + 各ユーザーの投稿作成)。
//
// 実行例:
//   k6 run performance-tests/scripts/seed.js
//   SEED_USERS=2000 SEED_POSTS_PER_USER=20 k6 run performance-tests/scripts/seed.js
//
// フォロー/いいねの投入は、全ユーザーの存在が前提になるため
// 本スクリプト完了後に scripts/seed-relations.js を別途実行すること。
import http from 'k6/http';
import { check } from 'k6';
import { assertLocalTarget, BASE_URL } from './lib/config.js';
import { registerPerfTestUser, authHeaders } from './lib/auth.js';

const SEED_USERS = parseInt(__ENV.SEED_USERS || '500', 10);
const SEED_POSTS_PER_USER = parseInt(__ENV.SEED_POSTS_PER_USER || '10', 10);

export const options = {
  scenarios: {
    seed: {
      executor: 'shared-iterations',
      vus: Math.min(20, SEED_USERS),
      iterations: SEED_USERS,
      maxDuration: '30m',
    },
  },
  // BCryptのハッシュ化コストがあるため、登録系は他シナリオよりゆるめの閾値にする
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  assertLocalTarget();
  console.log(
    `シード開始: ${SEED_USERS}ユーザー × 各${SEED_POSTS_PER_USER}投稿 を ${BASE_URL} に投入します`
  );
}

export default function () {
  // __VUは1始まりのため-1して0オフセットにする。これによりVU1・1回目のイテレーションが
  // 必ずindex=0(perftest_000000)になり、他シナリオがログイン用に決め打ちで参照できる。
  const index = __ITER + (__VU - 1) * 1000000; // 十分に大きいオフセットで衝突を避ける(VU数は最大でも数十想定)

  const user = registerPerfTestUser(index);
  if (!user) return;

  const headers = authHeaders(user.accessToken);
  for (let i = 0; i < SEED_POSTS_PER_USER; i++) {
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({ content: `perftest post #${i} by ${user.username}` }),
      { headers, tags: { name: 'seed_create_post' } }
    );
    check(res, { 'seed post: status is 201': (r) => r.status === 201 });
  }
}

export function teardown() {
  console.log('シード(ユーザー+投稿)完了。続けて seed-relations.js を実行してください。');
}
