import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MigrationErrorsQueryDto } from './dto/migration-errors-query.dto';
import { StartMigrationDto } from './dto/start-migration.dto';
import { MigrationService } from './services/migration.service';
import { ReconciliationService } from './services/reconciliation.service';
import { RetryService } from './services/retry.service';

/**
 * Migration lifecycle API (§20). Long work never runs inside these handlers:
 * POST /start creates the run and returns immediately while the engine
 * proceeds in the background.
 */
@ApiTags('migration')
@Controller('migration')
export class MigrationController {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly retryService: RetryService,
    private readonly reconciliationService: ReconciliationService,
    private readonly config: ConfigService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a migration run (returns immediately)' })
  @ApiResponse({ status: 201, description: 'Run created; processing continues in background' })
  @ApiResponse({ status: 409, description: 'Another run is already active' })
  start(@Body() dto: StartMigrationDto) {
    return this.migrationService.start(dto.tables);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Run progress: counters plus per-table checkpoints' })
  getStatus(@Param('id') id: string) {
    return this.migrationService.getStatus(id);
  }

  @Get(':id/errors')
  @ApiOperation({ summary: 'Paged quarantined records for a run' })
  getErrors(@Param('id') id: string, @Query() query: MigrationErrorsQueryDto) {
    return this.migrationService.getErrors(id, {
      tableName: query.table,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Resume the tail and re-process quarantined rows' })
  retry(@Param('id') id: string) {
    return this.retryService.retryFailed(id);
  }

  @Get(':id/reconciliation')
  @ApiOperation({ summary: 'Source vs target counts plus relationship integrity' })
  reconcile(@Param('id') id: string) {
    return this.reconciliationService.reconcile(id);
  }

  @Post('reset-target')
  @ApiOperation({ summary: 'DEV ONLY: wipe target data and metadata for repeatable demos' })
  resetTarget() {
    if (this.config.get<string>('nodeEnv') === 'production') {
      throw new ForbiddenException('target reset is disabled in production');
    }
    return this.migrationService.resetTarget();
  }
}
