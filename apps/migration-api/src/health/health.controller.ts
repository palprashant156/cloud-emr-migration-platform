import { Controller, Get } from '@nestjs/common';
import { HealthResponse, HealthService } from './health.service';

/**
 * GET /health — liveness probe for the migration API and source database.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
