import { Injectable } from '@nestjs/common';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { Encounter } from '../../encounters/entities/encounter.entity';
import { ValidationError } from '../interfaces/validation-error.interface';
import { EntityValidationResult } from './doctor-validator.service';

const TABLE = 'encounters';

/** Encounter validation: the clinical event must have a real date. */
@Injectable()
export class EncounterValidatorService {
  validate(encounter: Encounter): EntityValidationResult {
    const errors: ValidationError[] = [];
    if (!encounter.encounterDate || Number.isNaN(new Date(encounter.encounterDate).getTime())) {
      errors.push({
        table: TABLE,
        sourceId: encounter.encounterId,
        field: 'encounter_date',
        errorCode: MigrationErrorCode.INVALID_DATE,
        message: 'Encounter date is missing or not a real date',
        severity: 'ERROR',
      });
    }
    return { valid: errors.length === 0, errors };
  }
}
