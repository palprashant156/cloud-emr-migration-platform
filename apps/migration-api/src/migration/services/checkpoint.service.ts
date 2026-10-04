import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationCheckpoint } from '../entities/migration-checkpoint.entity';

export interface CheckpointState {
  lastProcessedId: number;
  processedCount: number;
}

/**
 * Checkpoint persistence. Written after every batch; read on (re)start, so
 * crashes and retries resume mid-table instead of from zero.
 */
@Injectable()
export class CheckpointService {
  constructor(
    @InjectRepository(MigrationCheckpoint, TARGET_DATA_SOURCE_NAME)
    private readonly checkpoints: Repository<MigrationCheckpoint>,
  ) {}

  async get(migrationId: string, tableName: string): Promise<CheckpointState> {
    const row = await this.checkpoints.findOne({ where: { migrationId, tableName } });
    return { lastProcessedId: row?.lastProcessedId ?? 0, processedCount: row?.processedCount ?? 0 };
  }

  async save(migrationId: string, tableName: string, state: CheckpointState): Promise<void> {
    await this.checkpoints.upsert(
      { migrationId, tableName, ...state },
      { conflictPaths: ['migrationId', 'tableName'], skipUpdateIfNoValuesChanged: true },
    );
  }

  listByRun(migrationId: string): Promise<MigrationCheckpoint[]> {
    return this.checkpoints.find({ where: { migrationId } });
  }
}
