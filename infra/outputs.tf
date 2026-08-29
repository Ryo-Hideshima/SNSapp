output "cloudfront_domain_name" {
  description = "アプリの公開URL(https://をつけてアクセスする)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "alb_dns_name" {
  description = "ALBのDNS名(直接アクセスするデバッグ用。通常はCloudFront経由でアクセスする)"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "バックエンドのDockerイメージをpushするECRリポジトリURI"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDSのエンドポイント(ホスト:ポート)"
  value       = aws_db_instance.main.endpoint
}

output "frontend_bucket_name" {
  description = "フロントエンドのビルド成果物をアップロードするS3バケット名"
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_deploy_command" {
  description = "フロントエンドをデプロイする際のコマンド例"
  value       = "npm --prefix frontend run build && aws s3 sync frontend/dist s3://${aws_s3_bucket.frontend.bucket} --delete"
}
