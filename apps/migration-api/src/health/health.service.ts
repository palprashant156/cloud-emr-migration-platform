import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';
import { TARGET_DATA_SOURCE_NAME } from '../database/target-database.module';

export type DatabaseHealth = 'connected' | 'disconnected' | 'not_configured';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  sourceDatabase: DatabaseHealth;
  targetDatabase: DatabaseHealth;
}

const HEALTH_CHECK_QUERY = 'SELECT 1 AS ok';

/**
 * HealthService — verifies the app can reach both databases.
 * Only coarse connectivity states leave this service — never credentials,
 * never patient data.
 */
@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource(SOURCE_DATA_SOURCE_NAME)
    private readonly sourceDataSource: DataSource,
    @InjectDataSource(TARGET_DATA_SOURCE_NAME)
    private readonly targetDataSource: DataSource,
  ) {}

  async check(): Promise<HealthResponse> {
    const [sourceDatabase, targetDatabase] = await Promise.all([
      this.ping(this.sourceDataSource),
      this.ping(this.targetDataSource),
    ]);
    const status = sourceDatabase === 'connected' && targetDatabase === 'connected' ? 'ok' : 'degraded';
    return {
      status,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      sourceDatabase,
      targetDatabase,
    };
  }

  private async ping(dataSource: DataSource): Promise<DatabaseHealth> {
    try {
      if (!dataSource.isInitialized) {
        return 'disconnected';
      }
      await dataSource.query(HEALTH_CHECK_QUERY);
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
