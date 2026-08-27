# frontend

新規登録・ログイン・ログイン後の仮画面を実装したReactアプリケーション（Vite + TypeScript）。

## 技術スタック

- React + TypeScript（Vite）
- react-router-dom
- アクセストークン・リフレッシュトークンを`localStorage`に保存し、`backend/`のJWT認証APIと連携

## ローカルでの起動方法

1. バックエンドを起動しておく（リポジトリ直下で`docker compose up -d`、`backend/`で`mvn spring-boot:run`）
2. `.env.example`を`.env`にコピーし、必要に応じて`VITE_API_BASE_URL`を変更する

   ```
   cp .env.example .env
   ```

3. 依存関係をインストールして開発サーバーを起動する

   ```
   npm install
   npm run dev
   ```

4. `http://localhost:5173` を開く（`/register`または`/login`から利用開始）

## 画面

| パス | 内容 |
|------|------|
| `/register` | 新規登録（ユーザー名・表示名・メールアドレス・パスワード） |
| `/login` | ログイン（メールアドレス・パスワード） |
| `/home` | ログイン後の仮画面。「ログイン成功」表示と、認証必須の`GET /api/hello`の結果を表示。ログアウトボタンあり |

## 認証の仕組み

- ログイン・登録成功時にバックエンドから返る`accessToken`（短命JWT）と`refreshToken`（長命・失効可能）を`localStorage`に保存する
- `src/api/client.ts`の`authFetch`は、APIが401を返した場合に`refreshToken`で`POST /api/auth/refresh`を呼び、新しいトークンに差し替えて元のリクエストを1回だけ再試行する
- ログアウト時は`POST /api/auth/logout`でサーバー側のリフレッシュトークンを失効させたうえで、ローカルのトークンを削除する
