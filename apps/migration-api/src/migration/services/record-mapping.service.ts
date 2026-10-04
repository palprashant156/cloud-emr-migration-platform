import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { RecordMapping } from '../entities/record-mapping.entity';

export interface SourceTargetPair {
  sourceId: number;
  targetId: number;
}

/**
 * CRUD over the source→target ID bridge. Mappings are the resume mechanism
 * (already-mapped sources are skipped) and the FK resolver for child rows.
 */
@Injectable()
export class RecordMappingService {
  constructor(
    @InjectRepository(RecordMapping, TARGET_DATA_SOURCE_NAME)
    private readonly mappings: Repository<RecordMapping>,
  ) {}

  /** Target IDs for the given sources (global scope — see entity docs). */
  async getTargetIds(entityType: EntityType, sourceIds: number[]): Promise<Map<number, number>> {
    if (sourceIds.length === 0) {
      return new Map();
    }
    const rows = await this.mappings.find({
      where: { entityType, sourceId: In(sourceIds) },
    });
    return new Map(rows.map((row) => [row.sourceId, row.targetId]));
  }

  /** Full source→target map for an entity (parent preloading for FK translation). */
  async getAllForEntity(entityType: EntityType): Promise<Map<number, number>> {
    const rows = await this.mappings.find({ where: { entityType } });
    return new Map(rows.map((row) => [row.sourceId, row.targetId]));
  }

  async saveMappings(migrationId: string, entityType: EntityType, pairs: SourceTargetPair[]): Promise<void> {
    if (pairs.length === 0) {
      return;
    }
    // orIgnore: a concurrent retry writing the same mapping is a no-op, not a failure.
    await this.mappings
      .createQueryBuilder()
      .insert()
      .values(
        pairs.map((pair) => ({
          migrationId,
          entityType,
          sourceId: pair.sourceId,
          targetId: pair.targetId,
        })),
      )
      .orIgnore()
      .execute();
  }

  countByRun(migrationId: string, entityType: EntityType): Promise<number> {
    return this.mappings.count({ where: { migrationId, entityType } });
  }
}
