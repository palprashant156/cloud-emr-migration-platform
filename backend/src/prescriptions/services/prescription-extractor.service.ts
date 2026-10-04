import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';
import { Prescription } from '../entities/prescription.entity';

/** Batched keyset reads over legacy `prescriptions`. */
@Injectable()
export class PrescriptionExtractorService {
  constructor(
    @InjectRepository(Prescription, SOURCE_DATA_SOURCE_NAME)
    private readonly prescriptions: Repository<Prescription>,
  ) {}

  count(): Promise<number> {
    return this.prescriptions.count();
  }

  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<Prescription[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.prescriptions
      .createQueryBuilder('prescription')
      .orderBy('prescription.prescriptionId', 'ASC')
      .limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('prescription.prescriptionId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  async *extractAll(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startAfterId: number | null = null,
  ): AsyncGenerator<Prescription[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = startAfterId;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].prescriptionId;
      if (batch.length < size) {
        return;
      }
    }
  }

  extractByIds(ids: number[]): Promise<Prescription[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prescriptions
      .createQueryBuilder('prescription')
      .where('prescription.prescriptionId IN (:...ids)', { ids })
      .orderBy('prescription.prescriptionId', 'ASC')
      .getMany();
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
