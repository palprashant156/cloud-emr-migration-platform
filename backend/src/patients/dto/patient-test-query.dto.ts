import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query params for `GET /patients/test`.
 * `limit` is hard-capped at 100: this is a smoke-test endpoint, not a dump.
 */
export class PatientTestQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
