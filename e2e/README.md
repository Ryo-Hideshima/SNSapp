# E2Eテスト（Playwright）

実際のブラウザで「登録→ログイン→投稿→いいね→フォロー」等の一連のユーザー操作を検証するE2Eテスト一式。`performance-tests/`と同じく**開発者が任意のタイミングで手元実行する**運用で、CI等では自動実行しない(このリポジトリにCIは無い)。

## 前提条件

ローカルスタックを起動しておく:
```bash
docker compose up -d                                              # PostgreSQL
cd backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn spring-boot:run   # http://localhost:8080
cd frontend && npm run dev                                        # http://localhost:5173(未起動でもPlaywrightが自動起動する)
```

依存関係のインストールとブラウザバイナリの取得:
```bash
cd e2e
npm install
npx playwright install chromium firefox webkit
```

## ディレクトリ構成

```
e2e/
  playwright.config.ts        - baseURL/projects(chromium中心+Firefox/WebKitスモーク)/globalTeardown
  global-teardown.ts          - 全テスト終了後、e2e_プレフィックスのデータをpgクライアントで直接削除
  fixtures/
    api.ts                     - バックエンドAPIを直接叩いてe2e_ユーザー/投稿を作るヘルパー
    authenticated-page.ts      - ログイン済み状態のpageを提供するカスタムfixture
  tests/
    scenarios/                 - 登録・ログイン・投稿・いいね/コメント・プロフィール/フォロー・検索・セッション期限切れ
    resilience/                - 存在しないリソース、APIエラー時の表示
    accessibility/             - axe-coreによる主要画面のスキャン
    performance/                - 単一セッションでのページ読み込み性能計測
```

## 実行コマンド

```bash
# 全テスト(chromium + firefox/webkitスモーク)を実行
npx playwright test

# chromiumのみ
npx playwright test --project=chromium

# 特定のファイル/ディレクトリだけ
npx playwright test tests/scenarios/auth.spec.ts
npx playwright test tests/performance

# UIモードでステップ実行しながらデバッグ
npx playwright test --ui

# 直近の実行結果(トレース・スクリーンショット付き)をブラウザで見る
npx playwright show-report
```

`FRONTEND_URL`(既定`http://localhost:5173`)・`BASE_URL`(バックエンド、既定`http://localhost:8080`)・`DATABASE_URL`(既定`postgresql://snsapp:snsapp@localhost:5432/snsapp`)は環境変数で上書きできる。

## テストデータの分離とクリーンアップ

生成するユーザー名は全て`e2e_`プレフィックス付き(`fixtures/api.ts`の`uniqueUsername()`)で、通常の開発データと混ざらない。**テスト実行後は`global-teardown.ts`が自動でPostgreSQLに接続し、`username LIKE 'e2e_%'`に該当するデータを外部キー制約を踏まえた順序(refresh_tokens→follows→likes→comments→posts→users)で削除する。** `performance-tests`のk6シナリオと異なり、Node.jsから本物のPostgresクライアント(`pg`)で直接接続できるため、手動でのクリーンアップスクリプト実行は不要。

## 対象外にしたもの

- **アバター画像アップロード(S3)**: 実際のAWSコスト・レート制限を避けるため、E2Eシナリオには含めていない(既存のバックエンド/フロントエンド単体テストでカバー済み)。
- **ビジュアルリグレッションテスト(スクリーンショット差分)**: 今回は導入しない。デザインがまだ変化しやすい段階でスクリーンショット差分を維持するコストが見合わないため。将来UIが安定したタイミングで検討する。

## クロスブラウザ方針

既定はChromium中心。Firefox/WebKitは`playwright.config.ts`の`firefox-smoke`/`webkit-smoke`プロジェクトとして、最重要フロー(`scenarios/auth.spec.ts`・`scenarios/posting.spec.ts`)のみを対象にした軽量なスモーク実行に限定している。

```bash
npx playwright test --project=firefox-smoke
npx playwright test --project=webkit-smoke
```

> **既知の制約**: macOS 14系では、Playwrightにバンドルされた新しめのWebKitビルドがOSのフレームワークバージョンと噛み合わず`Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled`で起動に失敗することがある(アプリ側・テストコード側の問題ではなく、Playwright/WebKit側の既知の環境依存の不具合)。CI環境や新しいmacOSでは問題なく動作する想定。

## パフォーマンステストとの違い

`performance-tests/scenarios/browser/01-user-journey.js`(k6-browser)は**多重仮想ブラウザでの負荷時**のブラウザ性能を計測するのに対し、`e2e/tests/performance/page-timing.spec.ts`は**単一セッションでの素の読み込み性能**を継続的に見張るための回帰検知用テスト。両者は役割が異なり、どちらか一方で代替できるものではない。Navigation Timing(TTFB/DOMContentLoaded/load)とWeb Vitals(LCP/CLS/イベント遅延)を追加ライブラリ無しでブラウザの`PerformanceObserver`から直接収集し、Core Web Vitalsの「良好」ラインを目安にした閾値を`expect()`でアサートする。
