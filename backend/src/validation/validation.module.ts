import { Module } from '@nestjs/common';
import { AppointmentValidatorService } from './services/appointment-validator.service';
import { DoctorValidatorService } from './services/doctor-validator.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { EmailValidationService } from './services/email-validation.service';
import { EncounterValidatorService } from './services/encounter-validator.service';
import { LabResultValidatorService } from './services/lab-result-validator.service';
import { PatientValidatorService } from './services/patient-validator.service';
import { PhoneNormalizationService } from './services/phone-normalization.service';
import { PrescriptionValidatorService } from './services/prescription-validator.service';

/**
 * Validation stage of the pipeline. One validator per entity, all following
 * the PatientValidator pattern; shared primitives (phone/email/duplicates)
 * stay in one place.
 */
@Module({
  providers: [
    PhoneNormalizationService,
    EmailValidationService,
    DuplicateDetectionService,
    PatientValidatorService,
    DoctorValidatorService,
    AppointmentValidatorService,
    EncounterValidatorService,
    PrescriptionValidatorService,
    LabResultValidatorService,
  ],
  exports: [
    PhoneNormalizationService,
    EmailValidationService,
    DuplicateDetectionService,
    PatientValidatorService,
    DoctorValidatorService,
    AppointmentValidatorService,
    EncounterValidatorService,
    PrescriptionValidatorService,
    LabResultValidatorService,
  ],
})
export class ValidationModule {}
