import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only trail of migration lifecycle events (§27). Batch-level, never per-row, and never carrying credentials or patient payloads. */
@Entity({ name: 'audit_logs' })
@Index(['migrationId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'migration_id', type: 'varchar', length: 64, nullable: true })
  migrationId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  event!: string;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
