import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { ValidationError } from '../interfaces/validation-error.interface';

export interface EntityValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const TABLE = 'doctors';
const MAX_NAME_LENGTH = 100;

/** Doctor validation: identity fields + license (the audit-critical natural key). */
@Injectable()
export class DoctorValidatorService {
  validate(doctor: Doctor): EntityValidationResult {
    const errors: ValidationError[] = [];
    const err = (field: string | null, errorCode: MigrationErrorCode, message: string): void => {
      errors.push({ table: TABLE, sourceId: doctor.doctorId, field, errorCode, message, severity: 'ERROR' });
    };
    if (!doctor.firstName || doctor.firstName.trim() === '') {
      err('first_name', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'First name is required');
    } else if (doctor.firstName.length > MAX_NAME_LENGTH) {
      err('first_name', MigrationErrorCode.INVALID_NAME, 'First name exceeds 100 characters');
    }
    if (!doctor.lastName || doctor.lastName.trim() === '') {
      err('last_name', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'Last name is required');
    } else if (doctor.lastName.length > MAX_NAME_LENGTH) {
      err('last_name', MigrationErrorCode.INVALID_NAME, 'Last name exceeds 100 characters');
    }
    if (!doctor.licenseNumber || doctor.licenseNumber.trim() === '') {
      err('license_number', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'License number is required');
    }
    return { valid: errors.length === 0, errors };
  }
}
