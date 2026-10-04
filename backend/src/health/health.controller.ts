import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponse, HealthService } from './health.service';

/**
 * GET /health — liveness probe for the migration API and source database.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Application and database health' })
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
