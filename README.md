# Cloud EMR Migration Platform

Cloud-native platform for migrating Electronic Medical Records (EMR) from a legacy PostgreSQL source to a modern cloud target (AWS RDS).

Pipeline: Extract → Validate → Transform → Deduplicate → ID Mapping → Batch Load → Reconcile → Report.

## Structure

- `apps/migration-api/` – NestJS migration engine (all 8 phases)
- `infrastructure/aws/` – Terraform: RDS target, S3 artifacts, DMS CDC (Phase 8)
- `docs/` – Architecture, mapping, strategy, failure handling, cutover
- `docker-compose.yml` – Local Postgres + API containers

Future phases add (inside `apps/migration-api/src/`): patients/doctors/… modules, validation, transformation, reconciliation, audit, health — plus `apps/migration-worker/` (Phase 5+) and `infrastructure/aws/` (Phase 8).

## Getting Started (Phase 1)

1. `cd apps/migration-api && cp .env.example .env` (defaults match local `emr_source` on `localhost:5432`)
2. `npm install`
3. `npm run start:dev`
4. `curl http://localhost:3000/health` → `{"status":"ok","sourceDatabase":"connected",…}`
5. `curl "http://localhost:3000/patients/test?limit=5"` → total count + sample rows

## Full migration demo

```bash
# 1. start (returns immediately, engine runs in background)
curl -X POST http://localhost:3000/migration/start -H 'Content-Type: application/json' -d '{}'
# {"migrationId":"mig_...","status":"STARTED"}

# 2. progress
curl http://localhost:3000/migration/mig_.../status

# 3. quarantined rows
curl 'http://localhost:3000/migration/mig_.../errors?limit=5'

# 4. resume tail + re-process errors (dup merges stay human decisions)
curl -X POST http://localhost:3000/migration/mig_.../retry

# 5. source vs target report
curl http://localhost:3000/migration/mig_.../reconciliation

# interactive API docs
open http://localhost:3000/api-docs
```

Expected on the seed data: 95,015 processed → 93,636 loaded, 1,379
quarantined (100 `MISSING_PHONE`, 50 `INVALID_EMAIL`, 5 `DUPLICATE_PATIENT`,
1,224 `MISSING_FOREIGN_KEY` cascade), zero orphan rows.
`POST /migration/reset-target` (dev only) wipes target + metadata for reruns.

See `docs/architecture.md` and `docs/migration-strategy.md`.
