resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "ALB: インターネットからのHTTPのみ許可(カスタムドメイン無しのためHTTPS/ACMは今回未対応)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_security_group" "fargate" {
  name        = "${var.project_name}-fargate"
  description = "ECS Fargateタスク: ALBからのみ8080を許可"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-fargate"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "RDS: Fargateタスクからのみ5432を許可"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "from Fargate"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.fargate.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds"
  }
}
