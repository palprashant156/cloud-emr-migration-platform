# Cloud EMR Migration Platform

Cloud-native platform for migrating Electronic Medical Records (EMR) from a legacy PostgreSQL source to a modern cloud target (AWS RDS).

Pipeline: Extract → Validate → Transform → Deduplicate → ID Mapping → Batch Load → Reconcile → Report.

## Structure

- `apps/migration-api/` – NestJS migration engine (implemented: config, source DB, health check, source entities, patient extraction, validation)
- `docs/` – Architecture, mapping, strategy, failure handling, cutover
- `docker-compose.yml` – Local Postgres + API containers

Future phases add (inside `apps/migration-api/src/`): patients/doctors/… modules, validation, transformation, reconciliation, audit, health — plus `apps/migration-worker/` (Phase 5+) and `infrastructure/aws/` (Phase 8).

## Getting Started (Phase 1)

1. `cd apps/migration-api && cp .env.example .env` (defaults match local `emr_source` on `localhost:5432`)
2. `npm install`
3. `npm run start:dev`
4. `curl http://localhost:3000/health` → `{"status":"ok","sourceDatabase":"connected",…}`
5. `curl "http://localhost:3000/patients/test?limit=5"` → total count + sample rows

See `docs/architecture.md` and `docs/migration-strategy.md`.
