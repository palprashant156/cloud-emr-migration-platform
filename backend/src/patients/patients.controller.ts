import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientTestQueryDto } from './dto/patient-test-query.dto';
import { PatientExtractorService } from './services/patient-extractor.service';

/**
 * Development smoke-test for extraction. Proves the source wiring,
 * the entity mapping, and keyset pagination against real legacy rows.
 *
 * NOTE: `test` is a static route and must stay registered before any future
 * `GET /patients/:id` route, otherwise the param route would swallow it.
 */
@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly extractor: PatientExtractorService) {}

  @Get('test')
  @ApiOperation({ summary: 'Smoke-test extraction against real legacy rows' })
  async test(@Query() query: PatientTestQueryDto) {
    const limit = query.limit ?? 10;
    const [totalPatients, sample] = await Promise.all([
      this.extractor.count(),
      this.extractor.extractBatch(null, limit),
    ]);
    return {
      totalPatients,
      batchSize: limit,
      sampleCount: sample.length,
      sample,
    };
  }
}
