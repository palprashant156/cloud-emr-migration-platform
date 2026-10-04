import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';

export interface PhoneNormalizationResult {
  original: string | null;
  /** Canonical E.164 form (`+91XXXXXXXXXX`), or null when invalid. */
  normalized: string | null;
  valid: boolean;
  errorCode: MigrationErrorCode.MISSING_PHONE | MigrationErrorCode.INVALID_PHONE | null;
}

const COUNTRY_PREFIX = '+91';

/**
 * Normalizes the phone representations found in the legacy EMR to one
 * canonical form: E.164 (`+91XXXXXXXXXX`).
 *
 * Rule (Indian mobile numbers, the entire source population):
 * 1. Drop every non-digit character.
 * 2. Accept 10 digits as-is; strip a leading `91` from 12-digit strings
 *    (country code without `+`); strip a leading trunk `0` from 11-digit
 *    strings. Anything else is malformed.
 * 3. The remaining 10 digits must start with 6–9 (Indian mobile range).
 *
 * Rationale: E.164 is unambiguous, sortable, and comparable — which is what
 * duplicate detection and the target schema need. Display formatting (spaces,
 * dashes) is a presentation concern and is intentionally discarded.
 */
@Injectable()
export class PhoneNormalizationService {
  normalize(phone: string | null | undefined): PhoneNormalizationResult {
    if (phone === null || phone === undefined || phone.trim() === '') {
      return {
        original: phone ?? null,
        normalized: null,
        valid: false,
        errorCode: MigrationErrorCode.MISSING_PHONE,
      };
    }
    const digits = phone.replace(/\D/g, '');
    let national: string | null = null;
    if (digits.length === 10) {
      national = digits;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      national = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      national = digits.slice(1);
    }
    if (national === null || !/^[6-9]/.test(national)) {
      return {
        original: phone,
        normalized: null,
        valid: false,
        errorCode: MigrationErrorCode.INVALID_PHONE,
      };
    }
    return {
      original: phone,
      normalized: `${COUNTRY_PREFIX}${national}`,
      valid: true,
      errorCode: null,
    };
  }
}
