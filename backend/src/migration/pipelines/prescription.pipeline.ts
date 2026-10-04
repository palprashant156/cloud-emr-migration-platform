import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetPrescription } from '../../database/target/entities/target-prescription.entity';
import { Prescription } from '../../prescriptions/entities/prescription.entity';
import { PrescriptionExtractorService } from '../../prescriptions/services/prescription-extractor.service';
import { PrescriptionTransformer } from '../../transformation/services/prescription.transformer';
import { PrescriptionValidatorService } from '../../validation/services/prescription-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class PrescriptionPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'prescription';
  readonly tableName = 'prescriptions';

  constructor(
    private readonly extractor: PrescriptionExtractorService,
    private readonly validator: PrescriptionValidatorService,
    private readonly transformer: PrescriptionTransformer,
    @InjectRepository(TargetPrescription, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetPrescription>,
  ) {}

  count(): Promise<number> {
    return this.extractor.count();
  }

  countTargets(): Promise<number> {
    return this.targets.count();
  }

  async countOrphans(): Promise<number> {
    const rows = await this.targets.query(
      `SELECT COUNT(*) AS count FROM prescriptions r
       WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = r.patient_id)
          OR NOT EXISTS (SELECT 1 FROM doctors d WHERE d.doctor_id = r.doctor_id)`,
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
    return (record as Prescription).prescriptionId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetPrescription).prescriptionId;
  }

  validate(record: unknown): ValidatedOutcome {
    return this.validator.validate(record as Prescription);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as Prescription);
  }

  resolveForeignKeys(row: unknown, maps: ForeignKeyMaps): string | null {
    const target = row as TargetPrescription;
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
    return manager.getRepository(TargetPrescription).save(rows as TargetPrescription[]);
  }
}
