# Cloud EMR Migration Platform

Cloud-native platform for migrating Electronic Medical Records (EMR) from legacy source systems to a modern cloud target.

## Structure

- `apps/migration-api/` – API service to trigger, monitor, and manage migrations
- `apps/migration-worker/` – Background workers for extract / transform / load jobs
- `database/source-emr/` – Source EMR schema, fixtures, and snapshots
- `database/target-schema/` – Target cloud schema and migrations
- `migration/extractors/` – Source data extractors
- `migration/transformers/` – Data transformation / mapping logic
- `migration/validators/` – Validation rules
- `migration/loaders/` – Target loaders
- `migration/reconciliation/` – Reconciliation and parity checks
- `infrastructure/aws/` – AWS infra (Terraform/CDK/CloudFormation)
- `docs/` – Architecture, mapping, strategy, failure handling, cutover
- `scripts/` – Operational scripts
- `tests/` – Integration / e2e tests

## Getting Started

1. `docker compose up -d`
2. `npm install`
3. See `docs/architecture.md` and `docs/migration-strategy.md`.
