import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetPatient } from '../../database/target/entities/target-patient.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientExtractorService } from '../../patients/services/patient-extractor.service';
import { PatientTransformer } from '../../transformation/services/patient.transformer';
import {
  DuplicateCandidate,
  DuplicateClassification,
  DuplicateDetectionService,
  DuplicateMatchReason,
} from '../../validation/services/duplicate-detection.service';
import { PatientValidatorService } from '../../validation/services/patient-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class PatientPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'patient';
  readonly tableName = 'patients';

  /** Global duplicate index (see buildDuplicateIndex). Key-only maps: tiny vs the table. */
  private exactFirst = new Map<string, number>();
  private possibleIndex = new Map<
    string,
    { reason: Exclude<DuplicateMatchReason, null | 'EXACT_MATCH'>; sourceId: number }
  >();
  private indexBuilt = false;

  constructor(
    private readonly extractor: PatientExtractorService,
    private readonly validator: PatientValidatorService,
    private readonly detector: DuplicateDetectionService,
    private readonly transformer: PatientTransformer,
    @InjectRepository(TargetPatient, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetPatient>,
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
    return (record as Patient).patientId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetPatient).patientId;
  }

  classifyDuplicates(records: unknown[]): Map<number, DuplicateClassification> {
    if (!this.indexBuilt) {
      // Fallback (tests, single-shot use): classify the window on its own.
      const candidates = this.toCandidates(records as Patient[]);
      return new Map(this.detector.classifyAll(candidates).map((c) => [c.sourceId, c]));
    }
    const result = new Map<number, DuplicateClassification>();
    for (const record of records as Patient[]) {
      const keys = this.detector.buildKeys(this.toCandidate(record));
      const first = this.exactFirst.get(keys.exact);
      if (first !== undefined && first !== record.patientId) {
        result.set(record.patientId, {
          sourceId: record.patientId,
          status: 'CONFIRMED_DUPLICATE',
          matchReason: 'EXACT_MATCH',
          matchedSourceId: first,
        });
        continue;
      }
      const lookups: Array<{ key: string | null; raw: string }> = [
        { key: keys.emailDob, raw: 'email' },
        { key: keys.phoneDob, raw: 'phone' },
        { key: keys.nameDob, raw: 'name' },
      ];
      let classified: DuplicateClassification = {
        sourceId: record.patientId,
        status: 'UNIQUE',
        matchReason: null,
        matchedSourceId: null,
      };
      for (const lookup of lookups) {
        if (lookup.key === null) {
          continue;
        }
        const hit = this.possibleIndex.get(`${lookup.raw}|${lookup.key}`);
        if (hit && hit.sourceId !== record.patientId) {
          classified = {
            sourceId: record.patientId,
            status: 'POSSIBLE_DUPLICATE',
            matchReason: hit.reason,
            matchedSourceId: hit.sourceId,
          };
          break;
        }
      }
      result.set(record.patientId, classified);
    }
    return result;
  }

  /** Streams the table once, indexing first-occurrence keys (no rows retained). */
  async buildDuplicateIndex(): Promise<void> {
    this.clearDuplicateIndex();
    for await (const batch of this.extractor.extractAll(DEFAULT_BATCH_SIZE)) {
      for (const record of batch) {
        const keys = this.detector.buildKeys(this.toCandidate(record));
        if (!this.exactFirst.has(keys.exact)) {
          this.exactFirst.set(keys.exact, record.patientId);
          if (keys.emailDob !== null && !this.possibleIndex.has(`email|${keys.emailDob}`)) {
            this.possibleIndex.set(`email|${keys.emailDob}`, { reason: 'EMAIL_DOB', sourceId: record.patientId });
          }
          if (keys.phoneDob !== null && !this.possibleIndex.has(`phone|${keys.phoneDob}`)) {
            this.possibleIndex.set(`phone|${keys.phoneDob}`, { reason: 'PHONE_DOB', sourceId: record.patientId });
          }
          if (!this.possibleIndex.has(`name|${keys.nameDob}`)) {
            this.possibleIndex.set(`name|${keys.nameDob}`, { reason: 'NAME_DOB', sourceId: record.patientId });
          }
        }
      }
    }
    this.indexBuilt = true;
  }

  clearDuplicateIndex(): void {
    this.exactFirst.clear();
    this.possibleIndex.clear();
    this.indexBuilt = false;
  }

  private toCandidates(records: Patient[]): DuplicateCandidate[] {
    return records.map((record) => this.toCandidate(record));
  }

  private toCandidate(record: Patient): DuplicateCandidate {
    return {
      sourceId: record.patientId,
      firstName: record.firstName,
      lastName: record.lastName,
      dateOfBirth: record.dateOfBirth,
      phone: record.phone,
      email: record.email,
    };
  }

  validate(record: unknown, duplicate?: DuplicateClassification): ValidatedOutcome {
    return this.validator.validate(record as Patient, duplicate);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as Patient);
  }

  resolveForeignKeys(_row: unknown, _maps: ForeignKeyMaps): string | null {
    return null; // root entity: nothing to translate
  }

  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]> {
    return manager.getRepository(TargetPatient).save(rows as TargetPatient[]);
  }
}
