import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetDoctor } from '../../database/target/entities/target-doctor.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { DoctorExtractorService } from '../../doctors/services/doctor-extractor.service';
import { DoctorTransformer } from '../../transformation/services/doctor.transformer';
import { DoctorValidatorService } from '../../validation/services/doctor-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class DoctorPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'doctor';
  readonly tableName = 'doctors';

  constructor(
    private readonly extractor: DoctorExtractorService,
    private readonly validator: DoctorValidatorService,
    private readonly transformer: DoctorTransformer,
    @InjectRepository(TargetDoctor, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetDoctor>,
  ) {}

  count(): Promise<number> {
    return this.extractor.count();
  }

  countTargets(): Promise<number> {
    return this.targets.count();
  }

  countOrphans(): Promise<number> {
    return Promise.resolve(0); // root entity: no parents
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
    return (record as Doctor).doctorId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetDoctor).doctorId;
  }

  validate(record: unknown): ValidatedOutcome {
    return this.validator.validate(record as Doctor);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as Doctor);
  }

  resolveForeignKeys(_row: unknown, _maps: ForeignKeyMaps): string | null {
    return null; // root entity: nothing to translate
  }

  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]> {
    return manager.getRepository(TargetDoctor).save(rows as TargetDoctor[]);
  }
}
