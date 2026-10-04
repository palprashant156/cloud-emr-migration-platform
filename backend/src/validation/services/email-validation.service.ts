import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';

export interface EmailValidationResult {
  original: string | null;
  /** Trimmed + lowercased form, or null when invalid. */
  normalized: string | null;
  valid: boolean;
  errorCode: MigrationErrorCode.MISSING_REQUIRED_FIELD | MigrationErrorCode.INVALID_EMAIL | null;
}

const LOCAL_PART = /^[A-Za-z0-9._%+-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const MAX_LENGTH = 254;

/**
 * Pragmatic email validation: structural checks with specific messages
 * instead of one inscrutable regex. Catches every malformed shape present in
 * the legacy data (`patient@`, `patient.example.com`, `patient@.com`,
 * `patient@@gmail.com`, `@gmail.com`) without pretending to implement
 * RFC 5322 (quoted local parts etc. — irrelevant for migration triage).
 *
 * Email is treated as required for migration: it is a contact channel and a
 * dedup key, so a missing value is a blocking MISSING_REQUIRED_FIELD.
 */
@Injectable()
export class EmailValidationService {
  validate(email: string | null | undefined): EmailValidationResult {
    if (email === null || email === undefined || email.trim() === '') {
      return {
        original: email ?? null,
        normalized: null,
        valid: false,
        errorCode: MigrationErrorCode.MISSING_REQUIRED_FIELD,
      };
    }
    const normalized = email.trim().toLowerCase();
    const failure = this.structuralFailure(normalized);
    if (failure !== null) {
      return {
        original: email,
        normalized: null,
        valid: false,
        errorCode: MigrationErrorCode.INVALID_EMAIL,
      };
    }
    return { original: email, normalized, valid: true, errorCode: null };
  }

  /** Returns a human reason, or null when the address is structurally sound. */
  structuralFailure(email: string): string | null {
    if (email.length > MAX_LENGTH) {
      return 'exceeds 254 characters';
    }
    if (email.includes(' ')) {
      return 'contains whitespace';
    }
    const parts = email.split('@');
    if (parts.length !== 2) {
      return 'must contain exactly one "@"';
    }
    const [local, domain] = parts;
    if (!local || !LOCAL_PART.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
      return `invalid local part "${local}"`;
    }
    if (!domain || !domain.includes('.') || domain.includes('..')) {
      return `invalid domain "${domain}"`;
    }
    const labels = domain.split('.');
    const tld = labels[labels.length - 1];
    if (!/^[A-Za-z]{2,}$/.test(tld)) {
      return `invalid top-level domain "${tld}"`;
    }
    if (!labels.every((label) => DOMAIN_LABEL.test(label))) {
      return `invalid domain "${domain}"`;
    }
    return null;
  }
}
