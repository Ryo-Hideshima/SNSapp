# インフラ(Terraform)

EC2を使わずに、S3+CloudFront(フロントエンド配信)・ECS Fargate(バックエンド実行)・RDS(DB)・S3(アバター画像、既存)でAWS上に構築するためのTerraformコード。

## アーキテクチャ

```
CloudFront (1ディストリビューション、PriceClass_100)
  ├─ デフォルトビヘイビア(/*)   → S3オリジン(OAC経由、フロントエンド静的ファイル)
  └─ /api/* ビヘイビア          → ALBオリジン(HTTP、カスタムオリジン)
                                     ↓
                                   ALB (パブリックサブネット)
                                     ↓
                                   ECS Fargateサービス (パブリックサブネット、public IP、NAT Gatewayなし)
                                     ├─→ RDS PostgreSQL (プライベートサブネット)
                                     └─→ S3 (アバター画像バケット、既存のS3Serviceがそのまま使える)
```

フロントエンド・バックエンドを同一CloudFrontドメイン配下(`/api/*`)にまとめているため、ブラウザから見ると同一オリジンになり、`backend`の`CORS_ALLOWED_ORIGINS`は実質的に問題にならない(念のためCloudFrontのドメインを設定はしている)。

## コスト最小化のためにやっていること

個人開発・学習用途を想定し、次の判断でランニングコストを抑えている。

- **NAT Gatewayを作らない**(最大の固定費要因、月$32〜を回避)。代わりにFargateタスクをパブリックサブネットに置き、直接パブリックIPを付与している
- カスタムドメイン(Route53ホストゾーン・ACM証明書)は無し。CloudFront/ALBのデフォルトドメインをそのまま使う
- RDSはシングルAZ・`db.t4g.micro`・ストレージ20GB(gp3)。Multi-AZやPerformance Insightsは有効化していない
- ECS FargateタスクはCPU 0.25vCPU/メモリ0.5GB(最小構成)、`desired_count=1`。オートスケーリングは入れているが上限を2に抑えている
- CloudFrontは`PriceClass_100`(北米・欧州のみ配信、最安価格クラス)
- CloudWatch Logsの保持期間は7日

**それでも残る主な固定費はALB(月$16〜+データ処理料)。** これは今回の構成図で明示的に要求されている要素なので維持しているが、個人開発でさらに切り詰めたい場合はALB+ECS Fargateの代わりにApp Runner(ALB不要)へ切り替える選択肢がある。

上記に加え、実際に動かすとFargate・RDSの実行時間課金、CloudFront/ALBのデータ転送量課金が発生する。**使わない時間は`terraform destroy`で止める**、あるいはECSサービスの`desired_count`を0にする運用を推奨する。

## 前提条件

- Terraform >= 1.5
- AWS CLIの認証情報が設定済み(`aws sts get-caller-identity`で確認できること)
- Docker(バックエンドイメージのビルド・push用)

## デプロイ手順

### 1. 変数を設定する

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvarsを開いてdb_password / jwt_secretを埋める
```

### 2. 初回apply

```bash
terraform init
terraform apply
```

ECRリポジトリにまだイメージが無い状態でECS Fargateタスクの起動を試みるため、**この時点ではバックエンドのタスクは起動に失敗し続ける**(ECSは自動的に再試行するので、想定内の一時的な状態)。Terraform自体のapplyはこれで正常に完了する。

### 3. バックエンドのイメージをビルド・push

```bash
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region $(terraform output -json | jq -r .aws_region.value 2>/dev/null || echo ap-northeast-1) \
  | docker login --username AWS --password-stdin "${ECR_URL%/*}"

docker build -t "$ECR_URL:latest" ../backend
docker push "$ECR_URL:latest"
```

pushが完了すると、ECSが自動的に新しいイメージでタスクを再起動する(数分待てばALBのヘルスチェックが通り、`/v3/api-docs`が200を返すようになる)。

### 4. フロントエンドをビルド・デプロイ

```bash
CF_DOMAIN=$(terraform output -raw cloudfront_domain_name)
# frontend/.env.productionは既にVITE_API_BASE_URL=(空、同一オリジン)になっている
npm --prefix ../frontend run build
aws s3 sync ../frontend/dist "s3://$(terraform output -raw frontend_bucket_name)" --delete
```

CloudFrontはデフォルトでキャッシュするため、再デプロイ後に反映されない場合は`aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`でキャッシュを無効化する。

### 5. 動作確認

```bash
open "https://$(terraform output -raw cloudfront_domain_name)"
```

## 後片付け

```bash
terraform destroy
```

RDSは`skip_final_snapshot = true`にしているため、`destroy`時にスナップショットを残さず即座に削除される(コスト優先の設定。本番データを扱う場合はこの設定を見直すこと)。

## 今回のスコープ外(次のステップ)

- GitHub Actions CIからのデプロイ自動化(ECRプッシュ・ECSサービス更新・S3同期・CloudFrontキャッシュ無効化)
- カスタムドメイン・HTTPS化(Route53・ACM)
- Secrets Managerへの本格移行(現状は`terraform.tfvars`経由でパスワード・JWTシークレットをタスク定義の環境変数に平文で渡している。学習用途としては動くが、本番運用するならSecrets Manager + ECSの`secrets`ブロックに切り替えるべき)
