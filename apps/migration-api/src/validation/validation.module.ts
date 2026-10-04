import { Module } from '@nestjs/common';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { EmailValidationService } from './services/email-validation.service';
import { PatientValidatorService } from './services/patient-validator.service';
import { PhoneNormalizationService } from './services/phone-normalization.service';

/**
 * Validation stage of the pipeline. Entity validators for the remaining
 * tables (DoctorValidator, AppointmentValidator, …) follow the PatientValidator
 * pattern and arrive with their Phase-5 migration order — this module already
 * exports the shared primitives they will all reuse.
 */
@Module({
  providers: [
    PhoneNormalizationService,
    EmailValidationService,
    DuplicateDetectionService,
    PatientValidatorService,
  ],
  exports: [
    PhoneNormalizationService,
    EmailValidationService,
    DuplicateDetectionService,
    PatientValidatorService,
  ],
})
export class ValidationModule {}
