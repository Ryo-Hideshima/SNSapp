# backend

ユーザー登録・ログインの認証認可を実装したSpring Bootアプリケーション。アクセストークン（短命JWT）とリフレッシュトークン（長命・DB保存・失効可能）を組み合わせた方式。

## 技術スタック

- Java 21 / Spring Boot 3.5 / Maven
- Spring Security（JWT認証）
- MyBatis（データアクセス）
- PostgreSQL / Flyway（DBマイグレーション）

## ローカルでの起動方法

1. PostgreSQLをDocker Composeで起動する（リポジトリ直下で実行）

   ```
   docker compose up -d
   ```

2. アプリケーションを起動する（`backend/`ディレクトリで実行）

   ```
   mvn spring-boot:run
   ```

   デフォルトでは `docker-compose.yml` の設定に合わせて `localhost:5432` のPostgreSQL（DB名/ユーザー/パスワードいずれも`snsapp`）に接続する。必要に応じて環境変数で上書きできる。

   | 環境変数 | 説明 | デフォルト |
   |---------|------|-----------|
   | `DB_URL` | JDBC接続URL | `jdbc:postgresql://localhost:5432/snsapp` |
   | `DB_USERNAME` | DBユーザー名 | `snsapp` |
   | `DB_PASSWORD` | DBパスワード | `snsapp` |
   | `JWT_SECRET` | JWT署名用シークレット（本番では必ず変更する） | 開発用の固定値 |
   | `JWT_ACCESS_EXPIRATION_MINUTES` | アクセストークンの有効期限（分） | `15` |
   | `JWT_REFRESH_EXPIRATION_DAYS` | リフレッシュトークンの有効期限（日） | `14` |
   | `CORS_ALLOWED_ORIGINS` | CORSで許可するオリジン（カンマ区切り） | `http://localhost:5173` |

## API

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| POST | `/api/auth/register` | 不要 | ユーザー登録し、アクセストークン・リフレッシュトークンを発行する |
| POST | `/api/auth/login` | 不要 | メールアドレス／パスワードでログインし、アクセストークン・リフレッシュトークンを発行する |
| POST | `/api/auth/refresh` | 不要（リフレッシュトークン必須） | リフレッシュトークンで新しいアクセストークン・リフレッシュトークンを発行する（ローテーション。使用済みの古いリフレッシュトークンは失効する） |
| POST | `/api/auth/logout` | 不要（リフレッシュトークン必須） | 指定したリフレッシュトークンをサーバー側で失効させる |
| GET | `/api/hello` | 必須（`Authorization: Bearer <アクセストークン>`） | ログイン後の画面が未実装のため、認証確認用に用意した仮のエンドポイント |

### 動作確認例（curl）

```
REG=$(curl -s -X POST localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"password123","displayName":"Alice"}')

ACCESS_TOKEN=$(echo "$REG" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
REFRESH_TOKEN=$(echo "$REG" | python3 -c "import sys,json;print(json.load(sys.stdin)['refreshToken'])")

curl localhost:8080/api/hello -H "Authorization: Bearer $ACCESS_TOKEN"

# アクセストークンの更新（リフレッシュトークンはローテーションされる）
curl -X POST localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# ログアウト（リフレッシュトークンを失効）
curl -X POST localhost:8080/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

## テスト

```
mvn test
```

Dockerは不要。テスト用DB(H2インメモリ、PostgreSQL互換モード)を`src/test/resources/application.yml`で構成しており、`db/migration`の本番マイグレーションをそのまま流して実データのやり取りを検証する。開発中のPostgreSQL(docker-compose)には一切書き込まない。

- `*ServiceTest`(例: `AuthServiceTest`, `PostServiceTest`): 各サービスのビジネスロジックの単体テスト（Mockitoでマッパーをモック）
- `mapper/*MapperTest`(例: `UserMapperTest`, `FollowMapperTest`): `@MybatisTest`でMyBatisのSQL(XML)自体をH2に対して実行し、N+1回避のJOINクエリや`ON CONFLICT DO NOTHING`の冪等性などが正しく動くかを検証する。各テストメソッドは自動ロールバックされる
- `controller/*ControllerTest`(例: `AuthControllerTest`, `PostControllerTest`): MockMvc + 実際のService/Mapper層を通した結合テスト(H2使用、`@Transactional`でテストごとにロールバック)。リクエスト〜DB書き込み〜レスポンスまでの一連の流れを検証する

## 静的解析（Checkstyle）

```
mvn checkstyle:check
```

未使用import・タブ文字混入・空catchブロックなど、最小限のスタイルチェックを行う(`checkstyle.xml`)。Javadoc必須化のような大規模な手直しを要するルールは含めていない。CIの`backend`ジョブでもテスト実行前に必ず実行される。
