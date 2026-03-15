variable "project_name" { type = string }
variable "environment" { type = string }

resource "aws_secretsmanager_secret" "database_url" {
  name = "${var.project_name}/${var.environment}/database-url"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "redis_url" {
  name = "${var.project_name}/${var.environment}/redis-url"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "jwt_keys" {
  name = "${var.project_name}/${var.environment}/jwt-keys"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "pii_encryption_key" {
  name = "${var.project_name}/${var.environment}/pii-encryption-key"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "razorpay" {
  name = "${var.project_name}/${var.environment}/razorpay"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "msg91" {
  name = "${var.project_name}/${var.environment}/msg91"

  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "gupshup" {
  name = "${var.project_name}/${var.environment}/gupshup"

  tags = { Environment = var.environment }
}

output "secret_arns" {
  value = {
    database_url       = aws_secretsmanager_secret.database_url.arn
    redis_url          = aws_secretsmanager_secret.redis_url.arn
    jwt_keys           = aws_secretsmanager_secret.jwt_keys.arn
    pii_encryption_key = aws_secretsmanager_secret.pii_encryption_key.arn
    razorpay           = aws_secretsmanager_secret.razorpay.arn
    msg91              = aws_secretsmanager_secret.msg91.arn
    gupshup            = aws_secretsmanager_secret.gupshup.arn
  }
}
