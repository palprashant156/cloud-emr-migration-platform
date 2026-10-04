import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';
import { Encounter } from '../entities/encounter.entity';

/** Batched keyset reads over legacy `encounters`. */
@Injectable()
export class EncounterExtractorService {
  constructor(
    @InjectRepository(Encounter, SOURCE_DATA_SOURCE_NAME)
    private readonly encounters: Repository<Encounter>,
  ) {}

  count(): Promise<number> {
    return this.encounters.count();
  }

  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<Encounter[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.encounters
      .createQueryBuilder('encounter')
      .orderBy('encounter.encounterId', 'ASC')
      .limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('encounter.encounterId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  async *extractAll(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startAfterId: number | null = null,
  ): AsyncGenerator<Encounter[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = startAfterId;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].encounterId;
      if (batch.length < size) {
        return;
      }
    }
  }

  extractByIds(ids: number[]): Promise<Encounter[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.encounters
      .createQueryBuilder('encounter')
      .where('encounter.encounterId IN (:...ids)', { ids })
      .orderBy('encounter.encounterId', 'ASC')
      .getMany();
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
