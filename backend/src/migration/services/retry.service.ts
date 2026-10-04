import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ENTITY_TABLE, EntityType } from '../../common/enums/entity-type.enum';
import { MigrationRunStatus } from '../../common/enums/migration-run-status.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { MigrationRun } from '../entities/migration-run.entity';
import { AuditService } from './audit.service';
import { MigrationEngineService } from './migration-engine.service';
import { MigrationErrorService } from './migration-error.service';
import { MAX_RETRIES, backoffMs } from './retry-policy';

export interface RetrySummary {
  migrationId: string;
  resumed: boolean;
  resolved: number;
  stillOpen: number;
  skippedDuplicateDecisions: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry (§24): resumes the unprocessed tail from checkpoints, then
 * re-processes OPEN errors row by row (the source may have been fixed since).
 *
 * Deliberately excluded: DUPLICATE_PATIENT rows — merging identities is a
 * human decision, not something a retry loop may take on its own.
 */
@Injectable()
export class RetryService {
  constructor(
    @InjectRepository(MigrationRun, TARGET_DATA_SOURCE_NAME)
    private readonly runs: Repository<MigrationRun>,
    private readonly engine: MigrationEngineService,
    private readonly errors: MigrationErrorService,
    private readonly audit: AuditService,
  ) {}

  async retryFailed(migrationId: string): Promise<RetrySummary> {
    const run = await this.runs.findOne({ where: { id: migrationId } });
    if (!run) {
      throw new NotFoundException(`migration run ${migrationId} not found`);
    }
    if (run.status === MigrationRunStatus.RUNNING) {
      throw new ConflictException(`migration ${migrationId} is still running`);
    }
    await this.audit.log('retry_started', migrationId, {});

    // 1. Resume anything never processed (crash recovery via checkpoints).
    await this.engine.execute(migrationId);

    // 2. Re-process quarantined rows.
    const open = await this.errors.listOpenErrors(migrationId);
    let resolved = 0;
    let skippedDuplicateDecisions = 0;
    for (const error of open) {
      if (error.errorCode === 'DUPLICATE_PATIENT') {
        skippedDuplicateDecisions += 1;
        continue;
      }
      const entityType = this.entityTypeForTable(error.tableName);
      if (!entityType) {
        continue;
      }
      let outcome = await this.engine.processSingleRecord(migrationId, entityType, error.sourceId);
      let attempt = error.retryCount;
      while (outcome.outcome === 'INSERT_FAILED' && attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        outcome = await this.engine.processSingleRecord(migrationId, entityType, error.sourceId);
      }
      if (outcome.outcome === 'LOADED') {
        await this.errors.setStatus(error.id, 'RESOLVED', attempt);
        resolved += 1;
        run.successfulRecords += 1;
      } else if (outcome.outcome === 'SOURCE_GONE') {
        await this.errors.setStatus(error.id, 'PERMANENT', attempt);
      } else if (outcome.outcome === 'INVALID' || outcome.outcome === 'FK_MISSING') {
        const exhausted = attempt >= MAX_RETRIES;
        await this.errors.setStatus(error.id, exhausted ? 'PERMANENT' : 'OPEN', attempt);
      } else {
        await this.errors.setStatus(error.id, attempt >= MAX_RETRIES ? 'PERMANENT' : 'OPEN', attempt);
      }
    }

    const refreshed = await this.runs.findOne({ where: { id: migrationId } });
    if (refreshed) {
      refreshed.failedRecords = await this.remainingFailures(migrationId);
      await this.runs.save(refreshed);
    }
    const stillOpen = await this.remainingFailures(migrationId);
    await this.audit.log('retry_completed', migrationId, { resolved, stillOpen, skippedDuplicateDecisions });
    return { migrationId, resumed: true, resolved, stillOpen, skippedDuplicateDecisions };
  }

  private entityTypeForTable(tableName: string): EntityType | null {
    const found = (Object.keys(ENTITY_TABLE) as EntityType[]).find(
      (type) => ENTITY_TABLE[type] === tableName,
    );
    return found ?? null;
  }

  private async remainingFailures(migrationId: string): Promise<number> {
    const open = await this.errors.listOpenErrors(migrationId);
    return open.length;
  }
}
