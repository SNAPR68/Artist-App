terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket = "artist-booking-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      Project     = "artist-booking"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project_name = "artist-booking"
  environment  = "dev"
}

module "vpc" {
  source       = "../../modules/vpc"
  project_name = local.project_name
  environment  = local.environment
}

module "s3_cloudfront" {
  source       = "../../modules/s3-cloudfront"
  project_name = local.project_name
  environment  = local.environment
}

module "sqs" {
  source       = "../../modules/sqs-sns"
  project_name = local.project_name
  environment  = local.environment
}

module "secrets" {
  source       = "../../modules/secrets"
  project_name = local.project_name
  environment  = local.environment
}

module "ecs" {
  source             = "../../modules/ecs"
  project_name       = local.project_name
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  api_image          = "artist-booking-api:dev"
  web_image          = "artist-booking-web:dev"
  api_desired_count  = 1
  web_desired_count  = 1
  api_cpu            = 256
  api_memory         = 512
  web_cpu            = 256
  web_memory         = 512
}

module "rds" {
  source                = "../../modules/rds"
  project_name          = local.project_name
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  app_security_group_id = module.ecs.app_security_group_id
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
}

module "elasticache" {
  source                = "../../modules/elasticache"
  project_name          = local.project_name
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  app_security_group_id = module.ecs.app_security_group_id
  node_type             = "cache.t3.micro"
}

module "opensearch" {
  source                = "../../modules/opensearch"
  project_name          = local.project_name
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  app_security_group_id = module.ecs.app_security_group_id
  instance_type         = "t3.small.search"
}

output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "cdn_domain" {
  value = module.s3_cloudfront.cdn_domain_name
}
