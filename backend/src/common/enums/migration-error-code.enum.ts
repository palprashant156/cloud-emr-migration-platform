/**
 * Canonical error codes for the migration pipeline (§11, §23 of the spec).
 * Every quarantined record carries one of these — never a free-text reason —
 * so failures are countable, retryable by policy, and reportable.
 * Transient/retry codes (DATABASE_TIMEOUT, …) arrive with Phase 6 persistence.
 */
export enum MigrationErrorCode {
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  MISSING_PHONE = 'MISSING_PHONE',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_NAME = 'INVALID_NAME',
  INVALID_DATE_OF_BIRTH = 'INVALID_DATE_OF_BIRTH',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_GENDER = 'INVALID_GENDER',
  DUPLICATE_PATIENT = 'DUPLICATE_PATIENT',
  POSSIBLE_DUPLICATE = 'POSSIBLE_DUPLICATE',
  MISSING_FOREIGN_KEY = 'MISSING_FOREIGN_KEY',
}
