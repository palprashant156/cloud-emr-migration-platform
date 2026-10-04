# AWS RDS target — the production home of the `emr_target` schema the NestJS
# app builds locally. The app needs no code changes: set TARGET_DB_HOST to
# this instance's endpoint and the matching credentials.

resource "aws_db_subnet_group" "emr" {
  name       = "${var.project}-subnets"
  subnet_ids = data.aws_subnets.private.ids
  tags       = { Name = "${var.project}-db-subnets" }
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "Postgres access for the migration API only"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.app_cidr]
  }
}

resource "aws_db_instance" "emr_target" {
  identifier             = "${var.project}-target"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "emr_target"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.emr.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  backup_retention_period = 7
  deletion_protection    = true
  skip_final_snapshot    = false
  tags                   = { Name = "${var.project}-target" }
}

output "rds_endpoint" {
  description = "Set TARGET_DB_HOST to this value"
  value       = aws_db_instance.emr_target.address
}
