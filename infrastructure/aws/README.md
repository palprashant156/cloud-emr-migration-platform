# AWS — Phase 8 (provision on demand, not part of local runs)

Local development never touches this directory. When the migration is proven
locally, provision the cloud target:

```bash
cd infrastructure/aws
export TF_VAR_db_password='...' TF_VAR_legacy_password='...'
terraform init
terraform plan
terraform apply
```

Point the app at RDS (no code changes — configuration is environment-driven):

```bash
TARGET_DB_HOST=<rds_endpoint from terraform output>
TARGET_DB_PORT=5432
TARGET_DB_USERNAME=emr_admin
TARGET_DB_PASSWORD='...'
TARGET_DB_NAME=emr_target
TARGET_DB_SYNCHRONIZE=false   # schema ships as reviewed migrations in prod
```

## Cutover runbook

1. `terraform apply` — RDS, S3, DMS replication instance.
2. Full load locally-proven engine against RDS (`POST /migration/start`),
   then `GET /migration/:id/reconciliation` until MATCHED-or-explained.
3. Start the DMS `full-load-and-cdc` task for delta catch-up from the legacy DB.
4. Freeze legacy writes → final delta drains → run reconciliation once more.
5. Promote RDS (reader/app traffic), snapshot legacy to S3 (`artifacts` bucket),
   decommission.

DMS moves bytes; validation, dedup, ID mapping, and reconciliation stay in the
NestJS engine — that division is intentional and powers the interview story.
