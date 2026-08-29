variable "aws_region" {
  description = "リソースを作成するAWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース名のプレフィックス"
  type        = string
  default     = "snsapp"
}

# --- Database ---

variable "db_name" {
  description = "PostgreSQLのデータベース名"
  type        = string
  default     = "snsapp"
}

variable "db_username" {
  description = "PostgreSQLのユーザー名"
  type        = string
  default     = "snsapp"
}

variable "db_password" {
  description = "PostgreSQLのパスワード(terraform.tfvarsやTF_VAR_db_passwordで指定する。デフォルト値は用意しない)"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDSインスタンスクラス。コスト最小化のため既定は最小構成"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDSのストレージ容量(GB)"
  type        = number
  default     = 20
}

# --- Backend (ECS Fargate) ---

variable "jwt_secret" {
  description = "JWT署名用シークレット(32バイト以上。terraform.tfvarsやTF_VAR_jwt_secretで指定する)"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "ECSタスクに使うコンテナイメージ(ECRリポジトリURI:タグ)。初回applyの時点ではまだECRにイメージが無いため、READMEの手順に従い段階的にapplyすること"
  type        = string
  default     = null
}

variable "fargate_cpu" {
  description = "Fargateタスクに割り当てるCPU単位(256 = 0.25 vCPU)。コスト最小化のため既定は最小値"
  type        = string
  default     = "256"
}

variable "fargate_memory" {
  description = "Fargateタスクに割り当てるメモリ(MB)。コスト最小化のため既定は最小値"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "ECSサービスの希望タスク数"
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Application Auto Scalingの最小タスク数"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Application Auto Scalingの最大タスク数(コスト最小化のため小さめに抑える)"
  type        = number
  default     = 2
}

variable "avatar_bucket_name" {
  description = "アバター画像用S3バケット名(backend/src/main/resources/application.ymlのAWS_S3_BUCKET_NAMEデフォルトと合わせる。既存バケットを使う場合はそのバケット名を指定する)"
  type        = string
  default     = "snsapp-images"
}

variable "log_retention_days" {
  description = "CloudWatch Logsの保持日数"
  type        = number
  default     = 7
}
