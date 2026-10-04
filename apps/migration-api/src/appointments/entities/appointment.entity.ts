import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * Read-only mapping of the legacy `appointments` table.
 * FKs are plain numeric columns — resolved via ID mapping at Load time.
 */
@Entity({ name: 'appointments', synchronize: false })
export class Appointment {
  @PrimaryColumn({
    name: 'appointment_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  appointmentId: number;

  @Column({ name: 'patient_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  patientId: number;

  @Column({ name: 'doctor_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  doctorId: number;

  @Column({ name: 'appointment_date', type: 'timestamp' })
  appointmentDate: Date;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status: string;
}
