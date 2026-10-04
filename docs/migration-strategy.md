# Migration Strategy

1. Snapshot source
2. Full load (historical)
3. Delta / CDC catch-up
4. Validation + reconciliation
5. Cutover

Environments: dev -> staging (dry run) -> prod.
