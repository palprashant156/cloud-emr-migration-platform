import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from '../appointments/appointments.module';
import { Appointment } from '../appointments/entities/appointment.entity';
import { TARGET_DATA_SOURCE_NAME } from '../database/target-database.module';
import { TargetAppointment } from '../database/target/entities/target-appointment.entity';
import { TargetDoctor } from '../database/target/entities/target-doctor.entity';
import { TargetEncounter } from '../database/target/entities/target-encounter.entity';
import { TargetLabResult } from '../database/target/entities/target-lab-result.entity';
import { TargetPatient } from '../database/target/entities/target-patient.entity';
import { TargetPrescription } from '../database/target/entities/target-prescription.entity';
import { DoctorsModule } from '../doctors/doctors.module';
import { Doctor } from '../doctors/entities/doctor.entity';
import { EncountersModule } from '../encounters/encounters.module';
import { Encounter } from '../encounters/entities/encounter.entity';
import { LabResultsModule } from '../lab-results/lab-results.module';
import { LabResult } from '../lab-results/entities/lab-result.entity';
import { PatientsModule } from '../patients/patients.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { TransformationModule } from '../transformation/transformation.module';
import { ValidationModule } from '../validation/validation.module';
import { AuditLog } from './entities/audit-log.entity';
import { MigrationCheckpoint } from './entities/migration-checkpoint.entity';
import { MigrationError } from './entities/migration-error.entity';
import { MigrationRun } from './entities/migration-run.entity';
import { RecordMapping } from './entities/record-mapping.entity';
import { MigrationController } from './migration.controller';
import { AppointmentPipeline } from './pipelines/appointment.pipeline';
import { DoctorPipeline } from './pipelines/doctor.pipeline';
import { EncounterPipeline } from './pipelines/encounter.pipeline';
import { LabResultPipeline } from './pipelines/lab-result.pipeline';
import { PatientPipeline } from './pipelines/patient.pipeline';
import { PrescriptionPipeline } from './pipelines/prescription.pipeline';
import { AuditService } from './services/audit.service';
import { CheckpointService } from './services/checkpoint.service';
import { MigrationEngineService } from './services/migration-engine.service';
import { MigrationErrorService } from './services/migration-error.service';
import { MigrationService } from './services/migration.service';
import { ReconciliationService } from './services/reconciliation.service';
import { RecordMappingService } from './services/record-mapping.service';
import { RetryService } from './services/retry.service';

/**
 * Migration stage: orchestration, engine, pipelines, and metadata.
 * Pulls extractors from the domain modules and validators/transformers from
 * their stages — responsibilities stay separated, the engine stays generic.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [Doctor, Appointment, Encounter, Prescription, LabResult],
      SOURCE_DATA_SOURCE_NAME,
    ),
    TypeOrmModule.forFeature(
      [
        TargetDoctor,
        TargetPatient,
        TargetAppointment,
        TargetEncounter,
        TargetPrescription,
        TargetLabResult,
        MigrationRun,
        MigrationError,
        MigrationCheckpoint,
        RecordMapping,
        AuditLog,
      ],
      TARGET_DATA_SOURCE_NAME,
    ),
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    EncountersModule,
    PrescriptionsModule,
    LabResultsModule,
    ValidationModule,
    TransformationModule,
  ],
  controllers: [MigrationController],
  providers: [
    DoctorPipeline,
    PatientPipeline,
    AppointmentPipeline,
    EncounterPipeline,
    PrescriptionPipeline,
    LabResultPipeline,
    MigrationEngineService,
    MigrationService,
    RetryService,
    ReconciliationService,
    RecordMappingService,
    CheckpointService,
    MigrationErrorService,
    AuditService,
  ],
  exports: [MigrationService, MigrationEngineService, ReconciliationService],
})
export class MigrationModule {}
