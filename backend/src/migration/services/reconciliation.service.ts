import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ENTITY_TABLE, EntityType, MIGRATION_ORDER } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationRun } from '../entities/migration-run.entity';
import { AppointmentPipeline } from '../pipelines/appointment.pipeline';
import { DoctorPipeline } from '../pipelines/doctor.pipeline';
import { EncounterPipeline } from '../pipelines/encounter.pipeline';
import { EntityPipeline } from '../pipelines/entity-pipeline.interface';
import { LabResultPipeline } from '../pipelines/lab-result.pipeline';
import { PatientPipeline } from '../pipelines/patient.pipeline';
import { PrescriptionPipeline } from '../pipelines/prescription.pipeline';
import { AuditService } from './audit.service';
import { MigrationErrorService } from './migration-error.service';
import { RecordMappingService } from './record-mapping.service';

export interface TableReconciliation {
  entityType: EntityType;
  table: string;
  sourceCount: number;
  targetCount: number;
  successful: number;
  failed: number;
  difference: number;
  orphans: number;
  status: 'MATCHED' | 'MISMATCHED';
}

export interface ReconciliationReport {
  migrationId: string;
  status: 'MATCHED' | 'MISMATCHED';
  tables: TableReconciliation[];
}

/**
 * Reconciliation (§26): per-table source vs target counts plus relationship
 * integrity (zero orphans). The snapshot is persisted on the run so the
 * migration report survives restarts.
 */
@Injectable()
export class ReconciliationService {
  private readonly byType: Record<EntityType, EntityPipeline>;

  constructor(
    doctorPipeline: DoctorPipeline,
    patientPipeline: PatientPipeline,
    appointmentPipeline: AppointmentPipeline,
    encounterPipeline: EncounterPipeline,
    prescriptionPipeline: PrescriptionPipeline,
    labResultPipeline: LabResultPipeline,
    @InjectRepository(MigrationRun, TARGET_DATA_SOURCE_NAME)
    private readonly runs: Repository<MigrationRun>,
    private readonly mappings: RecordMappingService,
    private readonly errors: MigrationErrorService,
    private readonly audit: AuditService,
  ) {
    this.byType = {
      doctor: doctorPipeline,
      patient: patientPipeline,
      appointment: appointmentPipeline,
      encounter: encounterPipeline,
      prescription: prescriptionPipeline,
      lab_result: labResultPipeline,
    };
  }

  async reconcile(migrationId: string): Promise<ReconciliationReport> {
    const run = await this.runs.findOne({ where: { id: migrationId } });
    if (!run) {
      throw new NotFoundException(`migration run ${migrationId} not found`);
    }
    const tables: TableReconciliation[] = [];
    for (const entityType of MIGRATION_ORDER) {
      const pipeline = this.byType[entityType];
      const table = ENTITY_TABLE[entityType];
      const [sourceCount, targetCount, successful, failed, orphans] = await Promise.all([
        pipeline.count(),
        pipeline.countTargets(),
        this.mappings.countByRun(migrationId, entityType),
        this.errors.countUnresolved(migrationId, table),
        pipeline.countOrphans(),
      ]);
      const difference = sourceCount - targetCount;
      tables.push({
        entityType,
        table,
        sourceCount,
        targetCount,
        successful,
        failed,
        difference,
        orphans,
        status: difference === 0 && orphans === 0 ? 'MATCHED' : 'MISMATCHED',
      });
    }
    const report: ReconciliationReport = {
      migrationId,
      status: tables.every((t) => t.status === 'MATCHED') ? 'MATCHED' : 'MISMATCHED',
      tables,
    };
    run.summary = { reconciledAt: new Date().toISOString(), ...report };
    await this.runs.save(run);
    await this.audit.log('reconciliation_completed', migrationId, { status: report.status });
    return report;
  }
}
