import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * The source→target ID bridge (§16). `source_patient_id = 251` says nothing
 * about the target row — this table says `251 → 8472`.
 *
 * Uniqueness is global per (entity, source): re-running migration never
 * duplicates target rows, it skips already-mapped sources. `migrationId`
 * records which run first loaded the row (provenance, not scoping).
 */
@Entity({ name: 'record_mappings' })
@Unique(['entityType', 'sourceId'])
@Index(['migrationId'])
export class RecordMapping {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'migration_id', type: 'varchar', length: 64 })
  migrationId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 32 })
  entityType!: string;

  @Column({ name: 'source_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  sourceId!: number;

  @Column({ name: 'target_id', type: 'int' })
  targetId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
