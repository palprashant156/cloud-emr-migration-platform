import { Module } from '@nestjs/common';
import { ValidationModule } from '../validation/validation.module';
import { AppointmentTransformer } from './services/appointment.transformer';
import { DoctorTransformer } from './services/doctor.transformer';
import { EncounterTransformer } from './services/encounter.transformer';
import { LabResultTransformer } from './services/lab-result.transformer';
import { PatientTransformer } from './services/patient.transformer';
import { PrescriptionTransformer } from './services/prescription.transformer';

/** Transformation stage: pure single-record source→target mappings. */
@Module({
  imports: [ValidationModule],
  providers: [
    DoctorTransformer,
    PatientTransformer,
    AppointmentTransformer,
    EncounterTransformer,
    PrescriptionTransformer,
    LabResultTransformer,
  ],
  exports: [
    DoctorTransformer,
    PatientTransformer,
    AppointmentTransformer,
    EncounterTransformer,
    PrescriptionTransformer,
    LabResultTransformer,
  ],
})
export class TransformationModule {}
