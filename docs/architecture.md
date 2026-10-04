# Architecture

## Overview
EMR migration platform: extract from legacy source EMR, transform, validate, load to cloud target, reconcile.

## Components
- `apps/migration-api`: NestJS migration engine (implemented: config, source DB, health, source entities, patient extraction)
- `apps/migration-api/src/*`: one module per pipeline stage — extractors, validators, transformers, loaders, reconciliation (Phases 2–7)
- `apps/migration-worker`: background ETL workers (planned, Phase 5+)
- `infrastructure/aws`: deployment (planned, Phase 8)

## Data Flow
Source EMR DB -> Extractors -> Transformers -> Validators -> Loaders -> Target DB -> Reconciliation
