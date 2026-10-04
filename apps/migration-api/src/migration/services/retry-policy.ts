import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';

/**
 * Retry policy (§24), kept as pure functions so the rules are unit-testable
 * without a database.
 *
 * Permanent: the data itself is wrong — retrying without fixing the source
 * row can never succeed (but reprocessing is still useful after a source fix,
 * which is what POST /migration/:id/retry does).
 * Transient: the row is fine, the infrastructure blinked — re-attempt with
 * exponential backoff, capped.
 */
export const TRANSIENT_ERROR_CODES: readonly string[] = [
  'TARGET_INSERT_ERROR',
  'DATABASE_ERROR',
];

export const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 100;
const BACKOFF_CAP_MS = 2000;

export function isTransientError(errorCode: string): boolean {
  return TRANSIENT_ERROR_CODES.includes(errorCode);
}

export function isPermanentError(errorCode: string): boolean {
  return !isTransientError(errorCode);
}

/** 100ms, 200ms, 400ms … capped at 2s. */
export function backoffMs(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempt), BACKOFF_CAP_MS);
}

/** Permanent data codes for documentation/tests. */
export const PERMANENT_ERROR_CODES: readonly MigrationErrorCode[] = [
  MigrationErrorCode.MISSING_REQUIRED_FIELD,
  MigrationErrorCode.MISSING_PHONE,
  MigrationErrorCode.INVALID_PHONE,
  MigrationErrorCode.INVALID_EMAIL,
  MigrationErrorCode.INVALID_NAME,
  MigrationErrorCode.INVALID_DATE_OF_BIRTH,
  MigrationErrorCode.INVALID_DATE,
  MigrationErrorCode.INVALID_STATUS,
  MigrationErrorCode.INVALID_GENDER,
  MigrationErrorCode.DUPLICATE_PATIENT,
  MigrationErrorCode.MISSING_FOREIGN_KEY,
];
