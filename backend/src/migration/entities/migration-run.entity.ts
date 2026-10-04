import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MigrationRunStatus } from '../../common/enums/migration-run-status.enum';

/** One migration execution (§19): counters, lifecycle, reconciliation snapshot. */
@Entity({ name: 'migration_runs' })
export class MigrationRun {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 16, default: MigrationRunStatus.PENDING })
  status!: MigrationRunStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'total_records', type: 'int', default: 0 })
  totalRecords!: number;

  @Column({ name: 'processed_records', type: 'int', default: 0 })
  processedRecords!: number;

  @Column({ name: 'successful_records', type: 'int', default: 0 })
  successfulRecords!: number;

  @Column({ name: 'failed_records', type: 'int', default: 0 })
  failedRecords!: number;

  /** Reconciliation snapshot written when the run completes. */
  @Column({ type: 'jsonb', nullable: true })
  summary!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
