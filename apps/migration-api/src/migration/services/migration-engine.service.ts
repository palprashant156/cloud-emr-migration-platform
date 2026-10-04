import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, LOAD_CHUNK_SIZE } from '../../common/constants/extraction.constants';
import { ENTITY_TABLE, EntityType, MIGRATION_ORDER } from '../../common/enums/entity-type.enum';
import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { MigrationRunStatus } from '../../common/enums/migration-run-status.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationRun } from '../entities/migration-run.entity';
import { RecordMapping } from '../entities/record-mapping.entity';
import { AppointmentPipeline } from '../pipelines/appointment.pipeline';
import { DoctorPipeline } from '../pipelines/doctor.pipeline';
import { EncounterPipeline } from '../pipelines/encounter.pipeline';
import { EntityPipeline, ForeignKeyMaps } from '../pipelines/entity-pipeline.interface';
import { LabResultPipeline } from '../pipelines/lab-result.pipeline';
import { PatientPipeline } from '../pipelines/patient.pipeline';
import { PrescriptionPipeline } from '../pipelines/prescription.pipeline';
import { AuditService } from './audit.service';
import { CheckpointService } from './checkpoint.service';
import { MigrationErrorService, RecordedError } from './migration-error.service';
import { RecordMappingService } from './record-mapping.service';

export type SingleRecordOutcome =
  | { outcome: 'LOADED'; targetId: number }
  | { outcome: 'SOURCE_GONE' }
  | { outcome: 'INVALID'; errors: RecordedError[] }
  | { outcome: 'FK_MISSING'; error: RecordedError }
  | { outcome: 'INSERT_FAILED'; message: string };

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The migration engine: Extract → Validate → Transform → FK-resolve → Load,
 * per entity in dependency order, in bounded batches with a checkpoint after
 * every batch.
 *
 * Transaction boundaries (§25): one transaction per load chunk covering the
 * target INSERTs plus their ID mappings — never the whole table, never just
 * the row without its mapping.
 */
@Injectable()
export class MigrationEngineService {
  private readonly logger = new Logger(MigrationEngineService.name);

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
    private readonly checkpoints: CheckpointService,
    private readonly errors: MigrationErrorService,
    private readonly audit: AuditService,
    @InjectDataSource(TARGET_DATA_SOURCE_NAME)
    private readonly target: DataSource,
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

  pipelineFor(entityType: EntityType): EntityPipeline {
    return this.byType[entityType];
  }

  /** Full (or partial) run. Idempotent: already-mapped sources are skipped. */
  async execute(migrationId: string, entityTypes: EntityType[] = [...MIGRATION_ORDER]): Promise<void> {
    const run = await this.requireRun(migrationId);
    run.status = MigrationRunStatus.RUNNING;
    run.startedAt = run.startedAt ?? new Date();
    if (run.totalRecords === 0) {
      run.totalRecords = await this.sumCounts(entityTypes);
    }
    await this.runs.save(run);
    await this.audit.log('migration_started', migrationId, { tables: entityTypes, totalRecords: run.totalRecords });

    try {
      for (const entityType of entityTypes) {
        await this.runEntity(run, this.byType[entityType]);
      }
      run.status = MigrationRunStatus.COMPLETED;
      run.completedAt = new Date();
      await this.runs.save(run);
      await this.audit.log('migration_completed', migrationId, {
        processed: run.processedRecords,
        successful: run.successfulRecords,
        failed: run.failedRecords,
      });
    } catch (error) {
      run.status = MigrationRunStatus.FAILED;
      await this.runs.save(run);
      await this.audit.log('migration_failed', migrationId, { message: (error as Error).message });
      throw error;
    }
  }

  /**
   * Single-record Extract→Validate→Transform→Load for the retry path.
   * The caller owns error persistence and status transitions.
   */
  async processSingleRecord(
    migrationId: string,
    entityType: EntityType,
    sourceId: number,
  ): Promise<SingleRecordOutcome> {
    const pipeline = this.byType[entityType];
    const tableName = ENTITY_TABLE[entityType];
    const records = await pipeline.extractByIds([sourceId]);
    if (records.length === 0) {
      return { outcome: 'SOURCE_GONE' };
    }
    const record = records[0];
    const validation = pipeline.validate(record);
    if (!validation.valid) {
      return {
        outcome: 'INVALID',
        errors: validation.errors
          .filter((e) => e.severity === 'ERROR')
          .map((e) => ({ tableName, sourceId, errorCode: e.errorCode, errorMessage: e.message })),
      };
    }
    const row = pipeline.transform(record);
    const maps = await this.loadParentMaps(entityType, [record], pipeline);
    const fkMessage = pipeline.resolveForeignKeys(row, maps);
    if (fkMessage !== null) {
      return {
        outcome: 'FK_MISSING',
        error: {
          tableName,
          sourceId,
          errorCode: MigrationErrorCode.MISSING_FOREIGN_KEY,
          errorMessage: fkMessage,
        },
      };
    }
    try {
      let targetId = 0;
      await this.target.transaction(async (manager) => {
        const saved = await pipeline.saveWithManager(manager, [row]);
        targetId = pipeline.getTargetId(saved[0]);
        await manager
          .createQueryBuilder()
          .insert()
          .into(RecordMapping)
          .values([{ migrationId, entityType, sourceId, targetId }])
          .orIgnore()
          .execute();
      });
      return { outcome: 'LOADED', targetId };
    } catch (error) {
      return { outcome: 'INSERT_FAILED', message: (error as Error).message };
    }
  }

  private async runEntity(run: MigrationRun, pipeline: EntityPipeline): Promise<void> {
    const tableName = pipeline.tableName;
    const checkpoint = await this.checkpoints.get(run.id, tableName);
    let lastId = checkpoint.lastProcessedId;
    let processed = checkpoint.processedCount;
    const parentMaps = await this.preloadParentMaps(pipeline.entityType);

    await pipeline.buildDuplicateIndex?.();
    try {
      for await (const batch of pipeline.extractAll(DEFAULT_BATCH_SIZE, lastId)) {
      const ids = batch.map((record) => pipeline.getSourceId(record));
      const alreadyMapped = await this.mappings.getTargetIds(pipeline.entityType, ids);
      const todo = batch.filter((record) => !alreadyMapped.has(pipeline.getSourceId(record)));

      let loaded = 0;
      let failed = 0;
      if (todo.length > 0) {
        const duplicates = pipeline.classifyDuplicates?.(todo) ?? new Map();
        const loadable: Array<{ sourceId: number; row: unknown }> = [];
        const invalid: RecordedError[] = [];
        for (const record of todo) {
          const sourceId = pipeline.getSourceId(record);
          const validation = pipeline.validate(record, duplicates.get(sourceId));
          if (!validation.valid) {
            failed += 1;
            for (const e of validation.errors.filter((err) => err.severity === 'ERROR')) {
              invalid.push({ tableName, sourceId, errorCode: e.errorCode, errorMessage: e.message });
            }
            continue;
          }
          loadable.push({ sourceId, row: pipeline.transform(record) });
        }
        await this.errors.recordErrors(run.id, invalid);

        const rows: Array<{ sourceId: number; row: unknown }> = [];
        for (const item of loadable) {
          const fkMessage = pipeline.resolveForeignKeys(item.row, parentMaps);
          if (fkMessage !== null) {
            failed += 1;
            await this.errors.recordErrors(run.id, [
              {
                tableName,
                sourceId: item.sourceId,
                errorCode: MigrationErrorCode.MISSING_FOREIGN_KEY,
                errorMessage: fkMessage,
              },
            ]);
          } else {
            rows.push(item);
          }
        }

        for (const chunk of chunks(rows, LOAD_CHUNK_SIZE)) {
          try {
            await this.target.transaction(async (manager) => {
              const saved = await pipeline.saveWithManager(
                manager,
                chunk.map((item) => item.row),
              );
              await manager
                .createQueryBuilder()
                .insert()
                .into(RecordMapping)
                .values(
                  saved.map((s, i) => ({
                    migrationId: run.id,
                    entityType: pipeline.entityType,
                    sourceId: chunk[i].sourceId,
                    targetId: pipeline.getTargetId(s),
                  })),
                )
                .orIgnore()
                .execute();
            });
            loaded += chunk.length;
          } catch (error) {
            failed += chunk.length;
            await this.errors.recordErrors(
              run.id,
              chunk.map((item) => ({
                tableName,
                sourceId: item.sourceId,
                errorCode: 'TARGET_INSERT_ERROR',
                errorMessage: (error as Error).message.slice(0, 1000),
              })),
            );
          }
        }
      }

      lastId = ids[ids.length - 1];
      processed += batch.length;
      await this.checkpoints.save(run.id, tableName, { lastProcessedId: lastId, processedCount: processed });
      run.processedRecords += batch.length;
      run.successfulRecords += loaded;
      run.failedRecords += failed;
      await this.runs.save(run);
      await this.audit.log('batch_processed', run.id, { table: tableName, batchSize: batch.length, loaded, failed });
      this.logger.log(`run=${run.id} table=${tableName} batch=${batch.length} loaded=${loaded} failed=${failed}`);
      }
    } finally {
      pipeline.clearDuplicateIndex?.();
    }
  }

  /** Parent maps preloaded once per entity run (tens of thousands of rows max). */
  private async preloadParentMaps(entityType: EntityType): Promise<ForeignKeyMaps> {
    const needs = (type: EntityType): boolean =>
      entityType === 'appointment' ||
      entityType === 'encounter' ||
      entityType === 'prescription' ||
      (entityType === 'lab_result' && type !== 'doctor');
    return {
      doctor: needs('doctor') ? await this.mappings.getAllForEntity('doctor') : new Map(),
      patient: needs('patient') ? await this.mappings.getAllForEntity('patient') : new Map(),
      encounter: entityType === 'lab_result' ? await this.mappings.getAllForEntity('encounter') : new Map(),
    };
  }

  private async loadParentMaps(
    entityType: EntityType,
    records: unknown[],
    pipeline: EntityPipeline,
  ): Promise<ForeignKeyMaps> {
    // Single-record path: look up only the parents actually referenced.
    const empty: ForeignKeyMaps = { doctor: new Map(), patient: new Map(), encounter: new Map() };
    if (entityType === 'doctor' || entityType === 'patient') {
      return empty;
    }
    const row = pipeline.transform(records[0]) as Record<string, number | null>;
    const parents: Array<{ key: keyof ForeignKeyMaps; type: EntityType; id: number | null }> = [
      { key: 'patient', type: 'patient', id: (row.patientId as number) ?? null },
    ];
    if (entityType !== 'lab_result') {
      parents.push({ key: 'doctor', type: 'doctor', id: (row.doctorId as number) ?? null });
    } else if (row.encounterId !== null && row.encounterId !== undefined) {
      parents.push({ key: 'encounter', type: 'encounter', id: row.encounterId as number });
    }
    for (const parent of parents) {
      if (parent.id !== null) {
        empty[parent.key] = await this.mappings.getTargetIds(parent.type, [parent.id]);
      }
    }
    return empty;
  }

  private async sumCounts(entityTypes: EntityType[]): Promise<number> {
    let total = 0;
    for (const type of entityTypes) {
      total += await this.byType[type].count();
    }
    return total;
  }

  private async requireRun(migrationId: string): Promise<MigrationRun> {
    const run = await this.runs.findOne({ where: { id: migrationId } });
    if (!run) {
      throw new Error(`migration run ${migrationId} not found`);
    }
    return run;
  }
}
