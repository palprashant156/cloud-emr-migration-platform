import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SOURCE_DATA_SOURCE_NAME } from '../database/source-database.module';

export type DatabaseHealth = 'connected' | 'disconnected' | 'not_configured';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  sourceDatabase: DatabaseHealth;
  /** Reserved for Phase 4 (target PostgreSQL / AWS RDS). */
  targetDatabase: DatabaseHealth;
}

const HEALTH_CHECK_QUERY = 'SELECT 1 AS ok';

/**
 * HealthService — verifies the app can reach the legacy EMR database.
 *
 * Uses a lightweight `SELECT 1` against the named `source` DataSource.
 * Never leaks credentials or patient data — the response carries only
 * coarse connectivity states.
 */
@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource(SOURCE_DATA_SOURCE_NAME)
    private readonly sourceDataSource: DataSource,
  ) {}

  async check(): Promise<HealthResponse> {
    const sourceDatabase = await this.pingSource();
    // Phase 4 will replace this constant with a real target-DB probe.
    const targetDatabase: DatabaseHealth = 'not_configured';
    return {
      status: sourceDatabase === 'connected' ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      sourceDatabase,
      targetDatabase,
    };
  }

  private async pingSource(): Promise<DatabaseHealth> {
    try {
      if (!this.sourceDataSource.isInitialized) {
        return 'disconnected';
      }
      await this.sourceDataSource.query(HEALTH_CHECK_QUERY);
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
