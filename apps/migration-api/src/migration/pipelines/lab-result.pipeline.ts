import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetLabResult } from '../../database/target/entities/target-lab-result.entity';
import { LabResult } from '../../lab-results/entities/lab-result.entity';
import { LabResultExtractorService } from '../../lab-results/services/lab-result-extractor.service';
import { LabResultTransformer } from '../../transformation/services/lab-result.transformer';
import { LabResultValidatorService } from '../../validation/services/lab-result-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class LabResultPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'lab_result';
  readonly tableName = 'lab_results';

  constructor(
    private readonly extractor: LabResultExtractorService,
    private readonly validator: LabResultValidatorService,
    private readonly transformer: LabResultTransformer,
    @InjectRepository(TargetLabResult, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetLabResult>,
  ) {}

  count(): Promise<number> {
    return this.extractor.count();
  }

  countTargets(): Promise<number> {
    return this.targets.count();
  }

  async countOrphans(): Promise<number> {
    const rows = await this.targets.query(
      `SELECT COUNT(*) AS count FROM lab_results l
       WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = l.patient_id)
          OR (l.encounter_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.encounter_id = l.encounter_id))`,
    );
    return Number(rows[0].count);
  }

  extractBatch(afterId: number | null, size: number): Promise<unknown[]> {
    return this.extractor.extractBatch(afterId, size);
  }

  extractAll(size: number, startAfter: number | null): AsyncGenerator<unknown[], void, void> {
    return this.extractor.extractAll(size, startAfter) as AsyncGenerator<unknown[], void, void>;
  }

  extractByIds(ids: number[]): Promise<unknown[]> {
    return this.extractor.extractByIds(ids);
  }

  getSourceId(record: unknown): number {
    return (record as LabResult).labResultId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetLabResult).labResultId;
  }

  validate(record: unknown): ValidatedOutcome {
    return this.validator.validate(record as LabResult);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as LabResult);
  }

  resolveForeignKeys(row: unknown, maps: ForeignKeyMaps): string | null {
    const target = row as TargetLabResult;
    const patientId = maps.patient.get(target.patientId);
    if (patientId === undefined) {
      return `patient source ${target.patientId} was not migrated (blocked upstream)`;
    }
    target.patientId = patientId;
    if (target.encounterId !== null && target.encounterId !== undefined) {
      const encounterId = maps.encounter.get(target.encounterId);
      if (encounterId === undefined) {
        return `encounter source ${target.encounterId} was not migrated (blocked upstream)`;
      }
      target.encounterId = encounterId;
    }
    return null;
  }

  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]> {
    return manager.getRepository(TargetLabResult).save(rows as TargetLabResult[]);
  }
}
