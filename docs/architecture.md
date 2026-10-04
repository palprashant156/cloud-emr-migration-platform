# Architecture

## Overview
EMR migration platform: extract from legacy source EMR, transform, validate, load to cloud target, reconcile.

## Components
- `apps/migration-api`: job orchestration API
- `apps/migration-worker`: ETL workers
- `migration/*`: extractors, transformers, validators, loaders, reconciliation
- `database/*`: source and target schemas
- `infrastructure/aws`: deployment

## Data Flow
Source EMR DB -> Extractors -> Transformers -> Validators -> Loaders -> Target DB -> Reconciliation
