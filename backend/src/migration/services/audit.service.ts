import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * Append-only audit trail. Batch-level granularity (never per-row), and
 * details carry counts/IDs only — no credentials, no patient payloads.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog, TARGET_DATA_SOURCE_NAME)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async log(
    event: string,
    migrationId: string | null,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    this.logger.log(`audit event=${event} migrationId=${migrationId ?? '-'} ${JSON.stringify(details)}`);
    const entry = this.auditLogs.create({ migrationId, event, details });
    await this.auditLogs.save(entry);
  }
}
