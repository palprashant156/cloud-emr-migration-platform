import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { LabResult } from '../../lab-results/entities/lab-result.entity';
import { ValidationError } from '../interfaces/validation-error.interface';
import { EntityValidationResult } from './doctor-validator.service';

const TABLE = 'lab_results';

/** Lab-result validation: a result without a test name is meaningless. */
@Injectable()
export class LabResultValidatorService {
  validate(labResult: LabResult): EntityValidationResult {
    const errors: ValidationError[] = [];
    if (!labResult.testName || labResult.testName.trim() === '') {
      errors.push({
        table: TABLE,
        sourceId: labResult.labResultId,
        field: 'test_name',
        errorCode: MigrationErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Test name is required',
        severity: 'ERROR',
      });
    }
    return { valid: errors.length === 0, errors };
  }
}
