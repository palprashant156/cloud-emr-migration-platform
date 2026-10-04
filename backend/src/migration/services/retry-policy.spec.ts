import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import {
  MAX_RETRIES,
  PERMANENT_ERROR_CODES,
  backoffMs,
  isPermanentError,
  isTransientError,
} from './retry-policy';

describe('retry-policy', () => {
  it('treats infrastructure failures as transient', () => {
    expect(isTransientError('TARGET_INSERT_ERROR')).toBe(true);
    expect(isTransientError('DATABASE_ERROR')).toBe(true);
  });

  it('treats every data-quality code as permanent', () => {
    for (const code of PERMANENT_ERROR_CODES) {
      expect(isPermanentError(code)).toBe(true);
    }
    expect(isPermanentError(MigrationErrorCode.DUPLICATE_PATIENT)).toBe(true);
    expect(isPermanentError(MigrationErrorCode.MISSING_FOREIGN_KEY)).toBe(true);
  });

  it('backs off exponentially with a cap', () => {
    expect(backoffMs(0)).toBe(100);
    expect(backoffMs(1)).toBe(200);
    expect(backoffMs(2)).toBe(400);
    expect(backoffMs(10)).toBe(2000);
  });

  it('caps attempts at MAX_RETRIES', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});
