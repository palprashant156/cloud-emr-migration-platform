import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { Prescription } from '../../prescriptions/entities/prescription.entity';
import { ValidationError } from '../interfaces/validation-error.interface';
import { EntityValidationResult } from './doctor-validator.service';

const TABLE = 'prescriptions';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Prescription validation: medicine identity + coherent date range. */
@Injectable()
export class PrescriptionValidatorService {
  validate(prescription: Prescription): EntityValidationResult {
    const errors: ValidationError[] = [];
    const err = (field: string | null, errorCode: MigrationErrorCode, message: string): void => {
      errors.push({ table: TABLE, sourceId: prescription.prescriptionId, field, errorCode, message, severity: 'ERROR' });
    };
    if (!prescription.medicineName || prescription.medicineName.trim() === '') {
      err('medicine_name', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'Medicine name is required');
    }
    for (const field of ['startDate', 'endDate'] as const) {
      const value = prescription[field];
      if (value !== null && value !== undefined && !DATE_PATTERN.test(value.trim())) {
        err(field === 'startDate' ? 'start_date' : 'end_date', MigrationErrorCode.INVALID_DATE, `Date "${value}" is not YYYY-MM-DD`);
      }
    }
    if (prescription.startDate && prescription.endDate && prescription.endDate < prescription.startDate) {
      err('end_date', MigrationErrorCode.INVALID_DATE, 'End date precedes start date');
    }
    return { valid: errors.length === 0, errors };
  }
}
