variable "region" {
  description = "AWS region for all migration resources"
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Name prefix for every resource"
  type        = string
  default     = "emr-migration"
}

variable "db_username" {
  description = "RDS master username (never commit a value)"
  type        = string
  default     = "emr_admin"
}

variable "db_password" {
  description = "RDS master password — pass via TF_VAR_db_password or Secrets Manager, never in code"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class (db.t3.micro suffices for the synthetic dataset)"
  type        = string
  default     = "db.t3.micro"
}

variable "app_cidr" {
  description = "CIDR allowed to reach RDS on 5432 (migration API / bastion)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "legacy_host" {
  description = "Reachable host of the legacy EMR Postgres (DMS source)"
  type        = string
  default     = ""
}

variable "legacy_username" {
  description = "DMS source username (read-only role)"
  type        = string
  default     = "dms_reader"
}

variable "legacy_password" {
  description = "DMS source password — via TF_VAR_legacy_password, never in code"
  type        = string
  sensitive   = true
  default     = ""
}
