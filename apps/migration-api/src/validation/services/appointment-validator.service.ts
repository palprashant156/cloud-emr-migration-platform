import { Injectable } from '@nestjs/common';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { ValidationError } from '../interfaces/validation-error.interface';
import { EntityValidationResult } from './doctor-validator.service';

const TABLE = 'appointments';
/** Canonical appointment statuses observed in the legacy data. */
export const VALID_APPOINTMENT_STATUSES = new Set(['SCHEDULED', 'COMPLETED', 'CANCELLED']);

/**
 * Appointment validation. No future-date rule — SCHEDULED appointments are
 * legitimately in the future. Parent existence is enforced at Load via ID
 * mapping (missing parent → MISSING_FOREIGN_KEY), not here.
 */
@Injectable()
export class AppointmentValidatorService {
  validate(appointment: Appointment): EntityValidationResult {
    const errors: ValidationError[] = [];
    const err = (field: string | null, errorCode: MigrationErrorCode, message: string): void => {
      errors.push({ table: TABLE, sourceId: appointment.appointmentId, field, errorCode, message, severity: 'ERROR' });
    };
    if (!appointment.appointmentDate || Number.isNaN(new Date(appointment.appointmentDate).getTime())) {
      err('appointment_date', MigrationErrorCode.INVALID_DATE, 'Appointment date is missing or not a real date');
    }
    if (!appointment.status || appointment.status.trim() === '') {
      err('status', MigrationErrorCode.MISSING_REQUIRED_FIELD, 'Status is required');
    } else if (!VALID_APPOINTMENT_STATUSES.has(appointment.status.trim().toUpperCase())) {
      err('status', MigrationErrorCode.INVALID_STATUS, `Status "${appointment.status}" is not one of SCHEDULED/COMPLETED/CANCELLED`);
    }
    return { valid: errors.length === 0, errors };
  }
}
