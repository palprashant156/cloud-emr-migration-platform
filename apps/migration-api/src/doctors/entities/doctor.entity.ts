import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * Read-only mapping of the legacy `doctors` table.
 * Note: this table has `created_at` but no `updated_at` — mapped as-is.
 */
@Entity({ name: 'doctors', synchronize: false })
export class Doctor {
  @PrimaryColumn({
    name: 'doctor_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  doctorId!: number;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ name: 'specialization', type: 'varchar', length: 100, nullable: true })
  specialization!: string | null;

  @Column({ name: 'license_number', type: 'varchar', length: 100, nullable: true })
  licenseNumber!: string | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
