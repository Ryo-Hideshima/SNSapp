# パフォーマンステスト（k6）

このアプリのバックエンドAPIと、実ブラウザでのUI操作の両方について、**開発者が任意のタイミングで手元実行する**パフォーマンステスト一式。CI等では自動実行しない。

## ⚠️ 安全上の注意（必ず読むこと）

- **ローカル開発環境専用。** 共有環境・本番環境には絶対に向けないこと。負荷テストは対象サーバーに実質的なDoSと同じ負荷をかける。
- 全スクリプトは`BASE_URL`/`FRONTEND_URL`が`localhost`/`127.0.0.1`以外を指している場合、環境変数`I_UNDERSTAND_THIS_IS_NOT_LOCAL=true`を明示的に指定しない限り実行前に中断する安全ガードが入っている（`scripts/lib/config.js`）。
- シードスクリプトは`perftest_`プレフィックス付きのユーザーを大量に作成する。**必ずローカルのdocker-compose DBに対して実行し、他の開発者と共有しているDBには向けないこと。**

## 前提条件

```bash
brew install k6
```

ローカルスタックを起動しておく:
```bash
docker compose up -d                         # PostgreSQL
cd backend && mvn spring-boot:run             # http://localhost:8080
cd frontend && npm run dev                    # http://localhost:5173
```

## ディレクトリ構成

```
performance-tests/
  scripts/
    lib/config.js        - BASE_URL/FRONTEND_URLの読み込みと安全ガード
    lib/auth.js           - register/loginの共通ヘルパー
    seed.js                - ユーザー+投稿の一括投入(ステップ1)
    seed-relations.js      - フォロー+いいねの一括投入(ステップ2、seed.js完了後に実行)
    cleanup.sql             - perftest_プレフィックスの全データを安全に削除(手動実行、シード全体をリセットしたいとき用)
    cleanup-pattern.sql     - 特定パターンのusernameだけを削除(run-with-cleanup.shが内部で使う)
    run-with-cleanup.sh     - k6シナリオを実行し、終了後にそのシナリオが作ったユーザーだけを自動削除するラッパー
  scenarios/
    01-timeline-read.js     - タイムライン読み込み(ページング + sinceIdポーリング)
    02-post-write.js        - 投稿の作成/更新/削除
    03-likes-comments.js    - 同一投稿への同時いいね/コメント(競合パスの検証)
    04-user-search.js       - ユーザー検索(LIKE検索、要注意クエリ)
    05-follow-profile.js    - プロフィール取得 + フォロートグル
    06-auth-flow.js         - register/login/refreshのスループット
    browser/01-user-journey.js - 実ブラウザでのログイン〜いいねまでの一連操作
  results/                  - k6の出力置き場(gitignore対象、各自で作成)
```

## 実行手順

### 1. データを投入する

```bash
# 既定: 500ユーザー × 各10投稿(数分かかる。BCryptのハッシュ化コストのため)
k6 run performance-tests/scripts/seed.js

# 件数を変えたい場合
SEED_USERS=2000 SEED_POSTS_PER_USER=20 k6 run performance-tests/scripts/seed.js
```

続けてフォロー/いいね関係も投入する(seed.jsとは別ユーザー`perftest_r*`を使う):
```bash
SEED_USER_COUNT=200 k6 run performance-tests/scripts/seed-relations.js
```

### 2. 個別のシナリオを実行する

各シナリオは`VUS`(仮想ユーザー数)・`DURATION`(実行時間)を環境変数で指定できる(既定はVUS=20, DURATION=1m)。

`01-timeline-read` / `04-user-search` / `05-follow-profile` は、シード済みの既存ユーザーにログインするだけで新規ユーザーを作らないため、そのまま`k6 run`でよい:
```bash
k6 run performance-tests/scenarios/01-timeline-read.js
k6 run performance-tests/scenarios/04-user-search.js
k6 run performance-tests/scenarios/05-follow-profile.js

# 例: より高い負荷で3分間
VUS=50 DURATION=3m k6 run performance-tests/scenarios/01-timeline-read.js
```

`02-post-write` / `03-likes-comments` / `06-auth-flow` は実行のたびに専用の`perftest_`ユーザーを新規作成するため、繰り返し実行するとデータが増え続ける。これらは`scripts/run-with-cleanup.sh`経由で実行すると、k6終了後にそのシナリオが作ったユーザーだけを自動削除する(k6のthresholds判定による終了コードはそのまま引き継がれる):
```bash
performance-tests/scripts/run-with-cleanup.sh performance-tests/scenarios/02-post-write.js 'perftest_w%'
performance-tests/scripts/run-with-cleanup.sh performance-tests/scenarios/03-likes-comments.js 'perftest_hp_%' --env VUS=50 --env DURATION=2m
performance-tests/scripts/run-with-cleanup.sh performance-tests/scenarios/06-auth-flow.js 'perftest_auth_%'
```

結果をファイルに残したい場合(`results/`は.gitignore対象なので自由に出力してよい):
```bash
mkdir -p performance-tests/results
k6 run --out json=performance-tests/results/timeline-read.json performance-tests/scenarios/01-timeline-read.js
```

### 3. ブラウザシナリオを実行する

実際にChromiumを起動し、ログイン→タイムライン無限スクロール→投稿作成→いいね、を一連の操作として実行する。API直叩きでは見えないフロントエンドのレンダリング・体感速度(Core Web Vitals)まで含めて計測する。ブラウザ起動はプロセスコストが高いため、VU数(同時ブラウザ数)はAPIシナリオよりずっと少なめにすること。このシナリオも実行のたびにUIログイン用ユーザーを新規作成するため、`run-with-cleanup.sh`経由での実行を推奨する。

```bash
performance-tests/scripts/run-with-cleanup.sh performance-tests/scenarios/browser/01-user-journey.js 'perftest_ui_%'

# 動作を目で確認したい場合(ヘッドレスを無効化してブラウザを表示)
K6_BROWSER_HEADLESS=false performance-tests/scripts/run-with-cleanup.sh performance-tests/scenarios/browser/01-user-journey.js 'perftest_ui_%'
```

### 4. テストデータをクリーンアップする

`02` / `03` / `06` / ブラウザシナリオは`run-with-cleanup.sh`経由で実行していれば、その回で作られたデータは実行のたびに自動で削除される。それとは別に、`seed.js` / `seed-relations.js`で投入した共有シードデータ（`01` / `04` / `05`が使い回すもの）は自動では消えないため、パフォーマンステストを一通り終えたタイミングで手動で削除する:

```bash
docker compose exec -T postgres psql -U snsapp -d snsapp < performance-tests/scripts/cleanup.sql
```
`perftest_`プレフィックスの付いたユーザーとその投稿・いいね・コメント・フォロー・リフレッシュトークンを全て、外部キー制約を踏まえた子→親の順で削除する。何度実行しても安全（既に無ければ0件になるだけ）。

**もっと簡単に完全にクリーンな状態へ戻したい場合**は、DBボリューム自体を作り直す方法もある(ただしこれは開発中の他のデータも全て消える点に注意):
```bash
docker compose down -v && docker compose up -d
# 起動時にFlywayがマイグレーションを再実行し、まっさらなDBになる
```

アバター画像アップロード(S3)は今回のシナリオには含めていない(実際のAWSコスト・レート制限を避けるため)。将来アバターアップロードのシナリオを追加する場合は、対応するS3オブジェクトの削除も本クリーンアップに追加する必要がある。

## 結果の見方

- 各シナリオは`thresholds`(例: `p(95)<500ms`, `http_req_failed rate<1%`)を定義しており、`k6 run`の終了コードで合否がわかる(閾値を超えると非ゼロ終了)。
- 存在しないリソースへのアクセスなど、404/400が正常系として許容されるシナリオ(`05-follow-profile.js`等)は`http.setResponseCallback(http.expectedStatuses(...))`でその旨を明示しており、`http_req_failed`が誤って高く出ないようにしてある。
- サマリの`checks_succeeded`が実際の正誤判定。`http_req_failed`はあくまでHTTPステータスベースの参考値。

## 事前に着目すべき既知のボトルネック候補

- **HikariCPの既定コネクションプール上限（未設定=デフォルト10）**: `backend/src/main/resources/application.yml`にプール関連の明示設定が無いため、Spring Bootのデフォルト(最大10)が使われている。同時接続がこれを超えるあたりでレイテンシが急激に悪化する可能性が高い。悪化が見られたら`spring.datasource.hikari.maximum-pool-size`のチューニングを検討する。
- **`04-user-search.js`のLIKE検索**: `UserMapper.search`は`LOWER(username) LIKE LOWER('%keyword%')`という先頭ワイルドカード検索で、B-treeインデックスが効かない。データ量が増えるほど他のクエリより先に劣化しやすい。
- **`06-auth-flow.js`のBCryptコスト**: パスワードハッシュ化はCPUバウンドな処理のため、DBを介さずCPUコア数で頭打ちになる可能性がある。
