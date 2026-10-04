# Architecture

## Overview
EMR migration platform: extract from legacy source EMR, transform, validate, load to cloud target, reconcile.

## Components
- `backend`: NestJS migration engine (all 8 phases — see README demo)
- `backend/src/*`: one module per pipeline stage — extraction, validation, transformation, migration engine, reconciliation
- `apps/migration-worker`: separate worker app (future scaling step — today the engine runs in-background inside the API; the MigrationModule exports exist for it)
- `infrastructure/aws`: Terraform for RDS + S3 + DMS CDC (Phase 8)

## Data Flow
Source EMR DB -> Extractors -> Transformers -> Validators -> Loaders -> Target DB -> Reconciliation
