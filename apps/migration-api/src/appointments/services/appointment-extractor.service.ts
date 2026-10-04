import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE } from '../../common/constants/extraction.constants';
import { SOURCE_DATA_SOURCE_NAME } from '../../database/source-database.module';
import { Appointment } from '../entities/appointment.entity';

/** Batched keyset reads over legacy `appointments`. */
@Injectable()
export class AppointmentExtractorService {
  constructor(
    @InjectRepository(Appointment, SOURCE_DATA_SOURCE_NAME)
    private readonly appointments: Repository<Appointment>,
  ) {}

  count(): Promise<number> {
    return this.appointments.count();
  }

  extractBatch(afterId: number | null, batchSize: number = DEFAULT_BATCH_SIZE): Promise<Appointment[]> {
    const size = this.normalizeBatchSize(batchSize);
    const qb = this.appointments
      .createQueryBuilder('appointment')
      .orderBy('appointment.appointmentId', 'ASC')
      .limit(size);
    if (afterId !== null && afterId !== undefined) {
      qb.where('appointment.appointmentId > :afterId', { afterId });
    }
    return qb.getMany();
  }

  async *extractAll(
    batchSize: number = DEFAULT_BATCH_SIZE,
    startAfterId: number | null = null,
  ): AsyncGenerator<Appointment[], void, void> {
    const size = this.normalizeBatchSize(batchSize);
    let afterId: number | null = startAfterId;
    for (;;) {
      const batch = await this.extractBatch(afterId, size);
      if (batch.length === 0) {
        return;
      }
      yield batch;
      afterId = batch[batch.length - 1].appointmentId;
      if (batch.length < size) {
        return;
      }
    }
  }

  extractByIds(ids: number[]): Promise<Appointment[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.appointments
      .createQueryBuilder('appointment')
      .where('appointment.appointmentId IN (:...ids)', { ids })
      .orderBy('appointment.appointmentId', 'ASC')
      .getMany();
  }

  private normalizeBatchSize(batchSize: number): number {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error(`batchSize must be a positive integer, got "${batchSize}"`);
    }
    return Math.min(batchSize, MAX_BATCH_SIZE);
  }
}
