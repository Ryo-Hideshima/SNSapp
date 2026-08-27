// APIリクエストの共通基盤(ベースURL・エラーハンドリング・ヘッダ構築)。
// 認証不要のJSON API(register/login/refresh/logout)はrequestJsonを、
// 認証必須のAPI(client.tsのauthFetch)はrawRequestを使う。どちらもここでURL・ヘッダの
// 組み立てを一本化し、重複実装を避ける。

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      return body.message;
    }
  } catch {
    // ignore JSON parse failure and fall back below
  }
  return "予期しないエラーが発生しました。";
}

/**
 * `init.headers`(プレーンオブジェクト・配列・Headersインスタンスいずれも可)をコピーしたうえで、
 * accessTokenが指定されていればAuthorizationヘッダを付与する。
 */
function buildHeaders(init: RequestInit, accessToken?: string | null): Headers {
  const headers = new Headers(init.headers);
  if (accessToken !== undefined) {
    headers.set("Authorization", `Bearer ${accessToken ?? ""}`);
  }
  return headers;
}

/** ベースURLとヘッダ構築だけを行う低レベルfetch。認証の有無はaccessTokenの指定有無で切り替える。 */
export function rawRequest(path: string, init: RequestInit = {}, accessToken?: string | null): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init, accessToken),
  });
}

/**
 * fetchのResponseをJSONとして解決する。エラー時はバックエンドのmessageを使ってApiErrorを投げる。
 * 認証不要のrequestJsonと、認証必須のauthFetch(client.ts)経由のレスポンスの両方から使う共通処理。
 */
export async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }
  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}

/** 認証不要のJSON API呼び出し。 */
export async function requestJson<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await rawRequest(path, init);
  return parseJsonResponse<TResponse>(response);
}
