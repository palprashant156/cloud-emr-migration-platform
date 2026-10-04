import { AuditLog } from '../migration/entities/audit-log.entity';
import { MigrationCheckpoint } from '../migration/entities/migration-checkpoint.entity';
import { MigrationError } from '../migration/entities/migration-error.entity';
import { MigrationRun } from '../migration/entities/migration-run.entity';
import { RecordMapping } from '../migration/entities/record-mapping.entity';
import { TargetAppointment } from './target/entities/target-appointment.entity';
import { TargetDoctor } from './target/entities/target-doctor.entity';
import { TargetEncounter } from './target/entities/target-encounter.entity';
import { TargetLabResult } from './target/entities/target-lab-result.entity';
import { TargetPatient } from './target/entities/target-patient.entity';
import { TargetPrescription } from './target/entities/target-prescription.entity';

/** Every entity owned by the target connection: migrated data + migration metadata (§18). */
export const TARGET_ENTITIES = [
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
];
