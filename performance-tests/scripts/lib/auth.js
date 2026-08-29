import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './config.js';

/**
 * perftest_プレフィックス付きのユーザーを新規登録する。
 * このプレフィックスがcleanup.sqlの削除対象の目印になる。
 */
export function registerPerfTestUser(index) {
  const username = `perftest_${String(index).padStart(6, '0')}`;
  const body = JSON.stringify({
    username,
    email: `${username}@perftest.local`,
    password: 'password123',
    displayName: `PerfTest ${index}`,
  });

  const res = http.post(`${BASE_URL}/api/auth/register`, body, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'auth_register' },
  });

  check(res, { 'register: status is 201': (r) => r.status === 201 });

  if (res.status !== 201) {
    return null;
  }

  const json = res.json();
  return {
    username,
    email: `${username}@perftest.local`,
    userId: json.userId,
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
  };
}

export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
  );

  check(res, { 'login: status is 200': (r) => r.status === 200 });

  if (res.status !== 200) {
    return null;
  }

  return res.json();
}

export function authHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}
