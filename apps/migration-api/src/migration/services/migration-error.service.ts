import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationError, MigrationErrorStatus } from '../entities/migration-error.entity';

export interface RecordedError {
  tableName: string;
  sourceId: number;
  errorCode: string;
  errorMessage: string;
}

export interface ErrorPage {
  total: number;
  page: number;
  limit: number;
  errors: MigrationError[];
}

/** Persistence for quarantined records (§23): bulk record, paged reads, lifecycle. */
@Injectable()
export class MigrationErrorService {
  constructor(
    @InjectRepository(MigrationError, TARGET_DATA_SOURCE_NAME)
    private readonly errors: Repository<MigrationError>,
  ) {}

  async recordErrors(migrationId: string, rows: RecordedError[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.errors
      .createQueryBuilder()
      .insert()
      .values(rows.map((row) => ({ migrationId, ...row, retryCount: 0, status: 'OPEN' as const })))
      .execute();
  }

  async listErrors(
    migrationId: string,
    options: { tableName?: string; page: number; limit: number },
  ): Promise<ErrorPage> {
    const where: Record<string, unknown> = { migrationId };
    if (options.tableName) {
      where.tableName = options.tableName;
    }
    const [errors, total] = await this.errors.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
    return { total, page: options.page, limit: options.limit, errors };
  }

  /** OPEN errors only — RESOLVED/PERMANENT rows are history, not work. */
  listOpenErrors(migrationId: string): Promise<MigrationError[]> {
    return this.errors.find({ where: { migrationId, status: 'OPEN' }, order: { id: 'ASC' } });
  }

  countUnresolved(migrationId: string, tableName: string): Promise<number> {
    return this.errors
      .createQueryBuilder('e')
      .where('e.migrationId = :migrationId', { migrationId })
      .andWhere('e.tableName = :tableName', { tableName })
      .andWhere("e.status IN ('OPEN', 'RETRYING', 'PERMANENT')")
      .getCount();
  }

  async setStatus(id: number, status: MigrationErrorStatus, retryCount?: number): Promise<void> {
    const patch: Partial<MigrationError> = { status };
    if (retryCount !== undefined) {
      patch.retryCount = retryCount;
    }
    await this.errors.update({ id }, patch);
  }
}
