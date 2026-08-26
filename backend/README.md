# backend

ユーザー登録・ログインの認証認可を実装したSpring Bootアプリケーション。

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
   | `JWT_EXPIRATION_MINUTES` | JWTの有効期限（分） | `60` |

## API

| メソッド | パス | 認証 | 概要 |
|---------|------|------|------|
| POST | `/api/auth/register` | 不要 | ユーザー登録し、JWTを発行する |
| POST | `/api/auth/login` | 不要 | メールアドレス／パスワードでログインし、JWTを発行する |
| GET | `/api/hello` | 必須（`Authorization: Bearer <token>`） | ログイン後の画面が未実装のため、認証確認用に用意した仮のエンドポイント |

### 動作確認例（curl）

```
curl -X POST localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"password123","displayName":"Alice"}'

TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl localhost:8080/api/hello -H "Authorization: Bearer $TOKEN"
```

## テスト

```
mvn test
```

- `AuthServiceTest`: 登録・ログインのビジネスロジックの単体テスト（Mockito）
- `AuthControllerIT`: Testcontainers上のPostgreSQLを使った結合テスト（登録→ログイン→認証必須エンドポイントへのアクセスまで）。Dockerが起動している必要がある
