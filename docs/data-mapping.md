# Data Mapping

Source -> Target field mappings.

| Source (source-emr) | Target (target-schema) | Notes |
|---|---|---|
| patients.id | patients.id | Preserve PK |
| patients.name | patients.full_name | Split if needed |
| encounters.* | encounters.* | TBD |
