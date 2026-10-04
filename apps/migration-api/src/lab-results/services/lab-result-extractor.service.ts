import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';
import { LabResult } from '../entities/lab-result.entity';

/** Batched keyset reads over legacy `lab_results`. */
@Injectable()
export class LabResultExtractorService {
  constructor(
    @InjectRepository(LabResult, SOURCE_DATA_SOURCE_NAME)
    private readonly labResults: Repository<LabResult>,
  ) {}

  count(): Promise<number> {
    return this.labResults.count();
  }

  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<LabResult[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.labResults
      .createQueryBuilder('labResult')
      .orderBy('labResult.labResultId', 'ASC')
      .limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('labResult.labResultId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  async *extractAll(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startAfterId: number | null = null,
  ): AsyncGenerator<LabResult[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = startAfterId;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].labResultId;
      if (batch.length < size) {
        return;
      }
    }
  }

  extractByIds(ids: number[]): Promise<LabResult[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.labResults
      .createQueryBuilder('labResult')
      .where('labResult.labResultId IN (:...ids)', { ids })
      .orderBy('labResult.labResultId', 'ASC')
      .getMany();
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
