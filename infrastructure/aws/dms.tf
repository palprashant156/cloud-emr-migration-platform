# AWS DMS for Phase-8 CDC catch-up: after the NestJS engine completes the
# historical full load, DMS replicates ongoing legacy changes (full-load +
# CDC task) until cutover. DMS moves bytes; the NestJS engine remains the
# system of record for validation, dedup, ID mapping, and reconciliation.

resource "aws_dms_replication_instance" "emr" {
  replication_instance_id   = "${var.project}-dms"
  replication_instance_class = "dms.t3.micro"
  allocated_storage         = 50
  publicly_accessible       = false
  tags                      = { Name = "${var.project}-dms" }
}

resource "aws_dms_source_endpoint" "legacy" {
  endpoint_id   = "${var.project}-legacy-source"
  endpoint_type = "source"
  engine_name   = "postgres"
  server_name   = var.legacy_host
  port          = 5432
  database_name = "emr_source"
  username      = var.legacy_username
  password      = var.legacy_password
  ssl_mode      = "require"
}

resource "aws_dms_target_endpoint" "rds" {
  endpoint_id   = "${var.project}-rds-target"
  endpoint_type = "target"
  engine_name   = "postgres"
  server_name   = aws_db_instance.emr_target.address
  port          = 5432
  database_name = "emr_target"
  username      = var.db_username
  password      = var.db_password
  ssl_mode      = "require"
}

resource "aws_dms_replication_task" "cdc_catchup" {
  replication_task_id      = "${var.project}-cdc"
  replication_instance_arn = aws_dms_replication_instance.emr.replication_instance_arn
  source_endpoint_arn      = aws_dms_source_endpoint.legacy.endpoint_arn
  target_endpoint_arn      = aws_dms_target_endpoint.rds.endpoint_arn
  migration_type           = "full-load-and-cdc"
  table_mappings           = file("${path.module}/dms-table-mappings.json")
  tags                     = { Name = "${var.project}-cdc" }
}
