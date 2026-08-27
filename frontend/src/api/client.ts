import { refresh } from "./auth";
import { clearSession, getAccessToken, getRefreshToken, updateTokens } from "../auth/tokenStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** リフレッシュ失敗などでセッションが切れたときに呼ばれる(AuthProviderが登録する) */
let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshOnce(): Promise<boolean> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = refresh({ refreshToken: currentRefreshToken })
      .then((response) => {
        updateTokens(response.accessToken, response.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * 認証必須のAPIを呼び出す共通fetch。
 * 401が返ってきた場合はリフレッシュトークンで一度だけアクセストークンの更新を試み、再試行する。
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken ?? ""}`,
    },
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await tryRefreshOnce();
  if (!refreshed) {
    clearSession();
    onSessionExpired?.();
    return response;
  }

  const newAccessToken = getAccessToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${newAccessToken ?? ""}`,
    },
  });
}
