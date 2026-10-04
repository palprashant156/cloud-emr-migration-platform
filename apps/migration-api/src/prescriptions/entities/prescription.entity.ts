import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/** Read-only mapping of the legacy `prescriptions` table. */
@Entity({ name: 'prescriptions', synchronize: false })
export class Prescription {
  @PrimaryColumn({
    name: 'prescription_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  prescriptionId: number;

  @Column({ name: 'patient_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  patientId: number;

  @Column({ name: 'doctor_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  doctorId: number;

  @Column({ name: 'medicine_name', type: 'varchar', length: 255 })
  medicineName: string;

  @Column({ name: 'dosage', type: 'varchar', length: 100, nullable: true })
  dosage: string | null;

  @Column({ name: 'frequency', type: 'varchar', length: 100, nullable: true })
  frequency: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;
}
