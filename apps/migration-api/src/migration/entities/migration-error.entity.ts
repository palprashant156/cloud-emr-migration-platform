import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

export type MigrationErrorStatus = 'OPEN' | 'RETRYING' | 'RESOLVED' | 'PERMANENT';

/**
 * One quarantined record (§23). Invalid rows never disappear — they land here
 * with a countable error code, a retry budget, and a lifecycle.
 */
@Entity({ name: 'migration_errors' })
@Index(['migrationId', 'tableName'])
export class MigrationError {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'migration_id', type: 'varchar', length: 64 })
  migrationId!: string;

  @Column({ name: 'table_name', type: 'varchar', length: 64 })
  tableName!: string;

  @Column({ name: 'source_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  sourceId!: number;

  @Column({ name: 'error_code', type: 'varchar', length: 64 })
  errorCode!: string;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: MigrationErrorStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
