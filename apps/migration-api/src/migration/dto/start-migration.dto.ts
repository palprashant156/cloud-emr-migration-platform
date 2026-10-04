import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

/**
 * Optional subset of entities to migrate. Omitted = full run in dependency
 * order. Order is always structural (doctors → … → lab_results); callers may
 * subset, never reorder.
 */
export class StartMigrationDto {
  @ApiPropertyOptional({
    description: 'Subset of entities to migrate',
    example: ['doctor', 'patient'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tables?: string[];
}
