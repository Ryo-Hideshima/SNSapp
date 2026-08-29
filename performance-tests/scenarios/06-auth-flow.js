// 認証フロー(register/login/refresh)のスループット計測。
// BCryptのハッシュ化コストはCPUバウンドなため、DBに関係なく上限が現れることを確認する。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { assertLocalTarget, BASE_URL } from '../scripts/lib/config.js';

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';

export const options = {
  scenarios: {
    auth_flow: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    'http_req_duration{name:auth_register}': ['p(95)<1000'],
    'http_req_duration{name:auth_login}': ['p(95)<1000'],
    'http_req_duration{name:auth_refresh}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  assertLocalTarget();
}

export default function () {
  const username = `perftest_auth_${__VU}_${Date.now()}`;
  const email = `${username}@perftest.local`;
  const password = 'password123';

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username, email, password, displayName: username }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_register' } }
  );
  check(registerRes, { 'register: status is 201': (r) => r.status === 201 });
  if (registerRes.status !== 201) return;

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
  );
  check(loginRes, { 'login: status is 200': (r) => r.status === 200 });
  if (loginRes.status !== 200) return;

  const refreshToken = loginRes.json('refreshToken');
  const refreshRes = http.post(
    `${BASE_URL}/api/auth/refresh`,
    JSON.stringify({ refreshToken }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_refresh' } }
  );
  check(refreshRes, { 'refresh: status is 200': (r) => r.status === 200 });

  sleep(1);
}
