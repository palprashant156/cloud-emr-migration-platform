import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';

export const DEFAULT_BATCH_SIZE = 1000;
export const MAX_BATCH_SIZE = 5000;

/**
 * Reads patients from the legacy EMR database in bounded batches.
 *
 * Why keyset pagination (`WHERE id > :afterId ORDER BY id LIMIT n`) instead
 * of offset pagination or `repository.find()`:
 * - Memory is bounded: only one batch (default 1,000 rows) is ever in RAM,
 *   so this scales from 10k rows to 10M without change.
 * - Keyset pages are stable: concurrent inserts don't shift rows between
 *   pages the way `OFFSET` does, so no record is skipped or read twice.
 * - `ORDER BY` on the indexed PK keeps every page a cheap index range scan.
 *
 * Deliberately framework-agnostic (plain `Error`, no HTTP exceptions) so the
 * Phase-5 migration worker can reuse it outside an HTTP context.
 */
@Injectable()
export class PatientExtractorService {
  constructor(
    @InjectRepository(Patient, SOURCE_DATA_SOURCE_NAME)
    private readonly patients: Repository<Patient>,
  ) {}

  /** Total rows in the source `patients` table (reconciliation baseline). */
  count(): Promise<number> {
    return this.patients.count();
  }

  /**
   * One page of patients strictly after `afterId` (`null` = from the start),
   * ascending by PK.
   */
  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<Patient[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.patients
      .createQueryBuilder('patient')
      .orderBy('patient.patientId', 'ASC')
      .limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('patient.patientId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  /**
   * Async generator over the whole table, one batch at a time:
   * `for await (const batch of extractor.extractAll(1000)) { ... }`.
   * The caller never holds more than a single batch in memory.
   */
  async *extractAll(batchSize: number = DEFAULT_BATCH_SIZE): AsyncGenerator<Patient[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = null;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].patientId;
      if (batch.length < size) {
        return;
      }
    }
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
