import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';
import { Doctor } from '../entities/doctor.entity';

/** Batched keyset reads over legacy `doctors` (same pattern as PatientExtractor). */
@Injectable()
export class DoctorExtractorService {
  constructor(
    @InjectRepository(Doctor, SOURCE_DATA_SOURCE_NAME)
    private readonly doctors: Repository<Doctor>,
  ) {}

  count(): Promise<number> {
    return this.doctors.count();
  }

  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<Doctor[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.doctors.createQueryBuilder('doctor').orderBy('doctor.doctorId', 'ASC').limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('doctor.doctorId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  async *extractAll(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startAfterId: number | null = null,
  ): AsyncGenerator<Doctor[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = startAfterId;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].doctorId;
      if (batch.length < size) {
        return;
      }
    }
  }

  extractByIds(ids: number[]): Promise<Doctor[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.doctors
      .createQueryBuilder('doctor')
      .where('doctor.doctorId IN (:...ids)', { ids })
      .orderBy('doctor.doctorId', 'ASC')
      .getMany();
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
