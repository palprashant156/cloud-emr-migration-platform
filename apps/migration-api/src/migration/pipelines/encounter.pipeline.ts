import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetEncounter } from '../../database/target/entities/target-encounter.entity';
import { Encounter } from '../../encounters/entities/encounter.entity';
import { EncounterExtractorService } from '../../encounters/services/encounter-extractor.service';
import { EncounterTransformer } from '../../transformation/services/encounter.transformer';
import { EncounterValidatorService } from '../../validation/services/encounter-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class EncounterPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'encounter';
  readonly tableName = 'encounters';

  constructor(
    private readonly extractor: EncounterExtractorService,
    private readonly validator: EncounterValidatorService,
    private readonly transformer: EncounterTransformer,
    @InjectRepository(TargetEncounter, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetEncounter>,
  ) {}

  count(): Promise<number> {
    return this.extractor.count();
  }

  countTargets(): Promise<number> {
    return this.targets.count();
  }

  async countOrphans(): Promise<number> {
    const rows = await this.targets.query(
      `SELECT COUNT(*) AS count FROM encounters e
       WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = e.patient_id)
          OR NOT EXISTS (SELECT 1 FROM doctors d WHERE d.doctor_id = e.doctor_id)`,
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
    return (record as Encounter).encounterId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetEncounter).encounterId;
  }

  validate(record: unknown): ValidatedOutcome {
    return this.validator.validate(record as Encounter);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as Encounter);
  }

  resolveForeignKeys(row: unknown, maps: ForeignKeyMaps): string | null {
    const target = row as TargetEncounter;
    const patientId = maps.patient.get(target.patientId);
    if (patientId === undefined) {
      return `patient source ${target.patientId} was not migrated (blocked upstream)`;
    }
    const doctorId = maps.doctor.get(target.doctorId);
    if (doctorId === undefined) {
      return `doctor source ${target.doctorId} was not migrated (blocked upstream)`;
    }
    target.patientId = patientId;
    target.doctorId = doctorId;
    return null;
  }

  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]> {
    return manager.getRepository(TargetEncounter).save(rows as TargetEncounter[]);
  }
}
