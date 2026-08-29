// 全シナリオ共通の設定読み込み。
// BASE_URL/FRONTEND_URLをlocalhost以外に向けた誤実行を防ぐガードを含む。

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

const ALLOWED_HOST_PATTERNS = ['://localhost', '://127.0.0.1'];

function isLocalUrl(url) {
  return ALLOWED_HOST_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * ローカル環境以外(共有・本番環境等)を誤って対象にしないための安全ガード。
 * 負荷テストは対象サーバーに実質的なDoSと同じ負荷をかけるため、
 * 明示的にI_UNDERSTAND_THIS_IS_NOT_LOCAL=trueを指定しない限り実行を中断する。
 * 各シナリオのsetup()の先頭で呼び出すこと。
 */
export function assertLocalTarget() {
  const allLocal = isLocalUrl(BASE_URL) && isLocalUrl(FRONTEND_URL);

  if (!allLocal && __ENV.I_UNDERSTAND_THIS_IS_NOT_LOCAL !== 'true') {
    throw new Error(
      `BASE_URL/FRONTEND_URLがlocalhost以外を指しています(${BASE_URL} / ${FRONTEND_URL})。` +
        '共有環境・本番環境に対する負荷テストは実質的なDoSになりえます。' +
        '本当に対象環境へ実行する場合は、環境変数 I_UNDERSTAND_THIS_IS_NOT_LOCAL=true を明示的に指定してください。'
    );
  }
}
