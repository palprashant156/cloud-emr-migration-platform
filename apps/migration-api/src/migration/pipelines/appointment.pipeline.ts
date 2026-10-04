import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AppointmentExtractorService } from '../../appointments/services/appointment-extractor.service';
import { EntityType } from '../../common/enums/entity-type.enum';
import { TARGET_DATA_SOURCE_NAME } from '../../database/target-database.module';
import { TargetAppointment } from '../../database/target/entities/target-appointment.entity';
import { AppointmentTransformer } from '../../transformation/services/appointment.transformer';
import { AppointmentValidatorService } from '../../validation/services/appointment-validator.service';
import { EntityPipeline, ForeignKeyMaps, ValidatedOutcome } from './entity-pipeline.interface';

@Injectable()
export class AppointmentPipeline implements EntityPipeline {
  readonly entityType: EntityType = 'appointment';
  readonly tableName = 'appointments';

  constructor(
    private readonly extractor: AppointmentExtractorService,
    private readonly validator: AppointmentValidatorService,
    private readonly transformer: AppointmentTransformer,
    @InjectRepository(TargetAppointment, TARGET_DATA_SOURCE_NAME)
    private readonly targets: Repository<TargetAppointment>,
  ) {}

  count(): Promise<number> {
    return this.extractor.count();
  }

  countTargets(): Promise<number> {
    return this.targets.count();
  }

  /** Target appointments referencing a missing patient or doctor. */
  async countOrphans(): Promise<number> {
    const rows = await this.targets.query(
      `SELECT COUNT(*) AS count FROM appointments a
       WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = a.patient_id)
          OR NOT EXISTS (SELECT 1 FROM doctors d WHERE d.doctor_id = a.doctor_id)`,
    );
    return Number(rows[0].count);
  }

  extractBatch(afterId: number | null, size: number): Promise<unknown[]> {
    return this.extractor.extractBatch(afterId, size);
  }

  extractAll(size: number, startAfter: number | null): AsyncGenerator<unknown[], void, void> {
    return this.extractor.extractAll(size, startAfter) as AsyncGenerator<unknown[], void, void>;
  }

  extractByIds(ids: number[]): Promise<unknown[]> {
    return this.extractor.extractByIds(ids);
  }

  getSourceId(record: unknown): number {
    return (record as Appointment).appointmentId;
  }

  getTargetId(saved: unknown): number {
    return (saved as TargetAppointment).appointmentId;
  }

  validate(record: unknown): ValidatedOutcome {
    return this.validator.validate(record as Appointment);
  }

  transform(record: unknown): unknown {
    return this.transformer.transform(record as Appointment);
  }

  resolveForeignKeys(row: unknown, maps: ForeignKeyMaps): string | null {
    const target = row as TargetAppointment;
    const patientId = maps.patient.get(target.patientId);
    if (patientId === undefined) {
      return `patient source ${target.patientId} was not migrated (blocked upstream)`;
    }
    const doctorId = maps.doctor.get(target.doctorId);
    if (doctorId === undefined) {
      return `doctor source ${target.doctorId} was not migrated (blocked upstream)`;
    }
    target.patientId = patientId;
    target.doctorId = doctorId;
    return null;
  }

  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]> {
    return manager.getRepository(TargetAppointment).save(rows as TargetAppointment[]);
  }
}
