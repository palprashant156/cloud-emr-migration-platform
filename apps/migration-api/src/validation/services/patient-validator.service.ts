import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { Patient } from '../../patients/entities/patient.entity';
import { ValidationError } from '../interfaces/validation-error.interface';
import { DuplicateClassification } from './duplicate-detection.service';
import { EmailValidationService } from './email-validation.service';
import { PhoneNormalizationService } from './phone-normalization.service';

export interface PatientValidationResult {
  sourceId: number;
  /** True when no ERROR-severity issue exists (WARNINGs still migrate). */
  valid: boolean;
  errors: ValidationError[];
}

const TABLE = 'patients';
const MAX_NAME_LENGTH = 100;
const VALID_GENDERS = new Set(['male', 'female', 'other']);
const MAX_HUMAN_AGE_YEARS = 120;

/**
 * Field-level patient validation. Pure checks only — normalization belongs to
 * transformation (Phase 5), so this service never rewrites the record, it
 * only judges it. Duplicate context is injected (cross-record state lives in
 * DuplicateDetectionService), keeping this validator single-record and
 * trivially testable.
 *
 * Note on names: no charset rule (digits etc.) — real-world and synthetic
 * names legitimately contain them; the validator enforces presence and the
 * column's length bound.
 */
@Injectable()
export class PatientValidatorService {
  constructor(
    private readonly phones: PhoneNormalizationService,
    private readonly emails: EmailValidationService,
  ) {}

  validate(patient: Patient, duplicate?: DuplicateClassification): PatientValidationResult {
    const errors: ValidationError[] = [];
    const err = (
      field: string | null,
      errorCode: MigrationErrorCode,
      message: string,
      severity: 'ERROR' | 'WARNING' = 'ERROR',
    ): void => {
      errors.push({ table: TABLE, sourceId: patient.patientId, field, errorCode, message, severity });
    };

    if (patient.firstName === null || patient.firstName === undefined || patient.firstName.trim() === '') {
      err('first_name', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'First name is required');
    } else if (patient.firstName.length > MAX_NAME_LENGTH) {
      err('first_name', MigrationErrorCode.INVALID_NAME, `First name exceeds ${MAX_NAME_LENGTH} characters`);
    }
    if (patient.lastName === null || patient.lastName === undefined || patient.lastName.trim() === '') {
      err('last_name', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'Last name is required');
    } else if (patient.lastName.length > MAX_NAME_LENGTH) {
      err('last_name', MigrationErrorCode.INVALID_NAME, `Last name exceeds ${MAX_NAME_LENGTH} characters`);
    }

    const dobFailure = this.dateOfBirthFailure(patient.dateOfBirth);
    if (dobFailure !== null) {
      err('date_of_birth', dobFailure.code, dobFailure.message);
    }

    if (patient.gender === null || patient.gender === undefined || patient.gender.trim() === '') {
      err('gender', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'Gender is required');
    } else if (!VALID_GENDERS.has(patient.gender.trim().toLowerCase())) {
      err('gender', MigrationErrorCode.INVALID_GENDER, `Gender "${patient.gender}" is not one of Male/Female/Other`);
    }

    const phone = this.phones.normalize(patient.phone);
    if (!phone.valid && phone.errorCode !== null) {
      err(
        'phone',
        phone.errorCode,
        phone.errorCode === MigrationErrorCode.MISSING_PHONE ? 'Phone number is missing' : `Phone "${patient.phone}" is not a valid Indian mobile number`,
      );
    }

    const email = this.emails.validate(patient.email);
    if (!email.valid && email.errorCode !== null) {
      err(
        'email',
        email.errorCode,
        email.errorCode === MigrationErrorCode.MISSING_REQUIRED_FIELD
          ? 'Email is required'
          : `Email "${patient.email}" is not a valid email address`,
      );
    }

    if (duplicate?.status === 'CONFIRMED_DUPLICATE') {
      err(
        null,
        MigrationErrorCode.DUPLICATE_PATIENT,
        `Exact duplicate of source patient ${duplicate.matchedSourceId} (${duplicate.matchReason})`,
      );
    } else if (duplicate?.status === 'POSSIBLE_DUPLICATE') {
      err(
        null,
        MigrationErrorCode.POSSIBLE_DUPLICATE,
        `Possible duplicate of source patient ${duplicate.matchedSourceId} (${duplicate.matchReason}); requires human review, never auto-merged`,
        'WARNING',
      );
    }

    return {
      sourceId: patient.patientId,
      valid: errors.every((e) => e.severity === 'WARNING'),
      errors,
    };
  }

  private dateOfBirthFailure(dob: string | null | undefined): { code: MigrationErrorCode; message: string } | null {
    if (dob === null || dob === undefined || dob.trim() === '') {
      return { code: MigrationErrorCode.MISSING_REQUIRED_FIELD, message: 'Date of birth is required' };
    }
    const text = dob.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return { code: MigrationErrorCode.INVALID_DATE_OF_BIRTH, message: `Date of birth "${text}" is not YYYY-MM-DD` };
    }
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      return { code: MigrationErrorCode.INVALID_DATE_OF_BIRTH, message: `Date of birth "${text}" is not a real calendar date` };
    }
    const now = new Date();
    if (date.getTime() > now.getTime()) {
      return { code: MigrationErrorCode.INVALID_DATE_OF_BIRTH, message: `Date of birth "${text}" is in the future` };
    }
    const ageYears = (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears > MAX_HUMAN_AGE_YEARS) {
      return { code: MigrationErrorCode.INVALID_DATE_OF_BIRTH, message: `Date of birth "${text}" implies age over ${MAX_HUMAN_AGE_YEARS}` };
    }
    return null;
  }
}
