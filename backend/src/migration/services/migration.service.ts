import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { ENTITY_TABLE, EntityType, MIGRATION_ORDER, isEntityType } from '../../common/enums/entity-type.enum';
import { MigrationRunStatus } from '../../common/enums/migration-run-status.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationRun } from '../entities/migration-run.entity';
import { AuditService } from './audit.service';
import { CheckpointService } from './checkpoint.service';
import { MigrationEngineService } from './migration-engine.service';
import { MigrationErrorService } from './migration-error.service';
import { RecordMappingService } from './record-mapping.service';

export interface TableProgress {
  entityType: EntityType;
  table: string;
  processed: number;
  successful: number;
  failed: number;
}

function generateRunId(): string {
  return `mig_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

/**
 * Migration orchestrator (§20/§21): owns run lifecycle and immediately
 * returns — the engine runs in the background, never inside the HTTP request.
 * One active run at a time (a second POST gets 409, not a corrupt overlap).
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private activeRunId: string | null = null;

  constructor(
    @InjectRepository(MigrationRun, TARGET_DATA_SOURCE_NAME)
    private readonly runs: Repository<MigrationRun>,
    private readonly engine: MigrationEngineService,
    private readonly mappings: RecordMappingService,
    private readonly checkpoints: CheckpointService,
    private readonly errors: MigrationErrorService,
    private readonly audit: AuditService,
  ) {}

  async start(tables?: string[]): Promise<{ migrationId: string; status: string }> {
    if (this.activeRunId !== null) {
      throw new ConflictException(`migration ${this.activeRunId} is already running`);
    }
    const entityTypes = this.resolveTables(tables);
    const run = await this.runs.save(
      this.runs.create({
        id: generateRunId(),
        status: MigrationRunStatus.PENDING,
        startedAt: null,
        completedAt: null,
      }),
    );
    this.activeRunId = run.id;
    const activeId = run.id;
    void this.engine
      .execute(run.id, entityTypes)
      .catch((error: Error) => this.logger.error(`run=${run.id} crashed: ${error.message}`, error.stack))
      .finally(() => {
        if (this.activeRunId === activeId) {
          this.activeRunId = null;
        }
      });
    return { migrationId: run.id, status: 'STARTED' };
  }

  async getStatus(migrationId: string): Promise<{ run: MigrationRun; tables: TableProgress[] }> {    const run = await this.requireRun(migrationId);
    const checkpoints = await this.checkpoints.listByRun(migrationId);
    const byTable = new Map(checkpoints.map((c) => [c.tableName, c]));
    const tables: TableProgress[] = [];
    for (const entityType of MIGRATION_ORDER) {
      const table = ENTITY_TABLE[entityType];
      const checkpoint = byTable.get(table);
      tables.push({
        entityType,
        table,
        processed: checkpoint?.processedCount ?? 0,
        successful: await this.mappings.countByRun(migrationId, entityType),
        failed: await this.errors.countUnresolved(migrationId, table),
      });
    }
    return { run, tables };
  }

  async getErrors(
    migrationId: string,
    options: { tableName?: string; page: number; limit: number },
  ) {
    await this.requireRun(migrationId);
    return this.errors.listErrors(migrationId, options);
  }

  /** Dev-only escape hatch for repeatable demos: wipe target + metadata. */
  async resetTarget(): Promise<{ truncated: string[] }> {
    const queryRunner = await this.runs.manager.connection.createQueryRunner();
    const tables = [
      'lab_results',
      'prescriptions',
      'encounters',
      'appointments',
      'patients',
      'doctors',
      'record_mappings',
      'migration_errors',
      'migration_checkpoints',
      'audit_logs',
      'migration_runs',
    ];
    try {
      for (const table of tables) {
        await queryRunner.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY`);
      }
    } finally {
      await queryRunner.release();
    }
    await this.audit.log('target_reset', null, { tables });
    return { truncated: tables };
  }

  private resolveTables(tables: string[] | undefined): EntityType[] {
    if (!tables || tables.length === 0) {
      return [...MIGRATION_ORDER];
    }
    const unknown = tables.filter((t) => !isEntityType(t));
    if (unknown.length > 0) {
      throw new ConflictException(`unknown tables: ${unknown.join(', ')}`);
    }
    const requested = new Set(tables as EntityType[]);
    // Dependency order is structural — callers may subset, never reorder.
    return MIGRATION_ORDER.filter((t) => requested.has(t));
  }

  private async requireRun(migrationId: string): Promise<MigrationRun> {
    const run = await this.runs.findOne({ where: { id: migrationId } });
    if (!run) {
      throw new NotFoundException(`migration run ${migrationId} not found`);
    }
    return run;
  }
}
