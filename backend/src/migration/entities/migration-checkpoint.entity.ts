import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * Resume point per (run, table) (§22). Written after every batch, so a crash
 * at row 5,000 resumes at 5,000 — never from zero.
 */
@Entity({ name: 'migration_checkpoints' })
@Unique(['migrationId', 'tableName'])
export class MigrationCheckpoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'migration_id', type: 'varchar', length: 64 })
  migrationId!: string;

  @Column({ name: 'table_name', type: 'varchar', length: 64 })
  tableName!: string;

  @Column({ name: 'last_processed_id', type: 'bigint', transformer: BigIntToNumberTransformer, default: 0 })
  lastProcessedId!: number;

  @Column({ name: 'processed_count', type: 'int', default: 0 })
  processedCount!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
