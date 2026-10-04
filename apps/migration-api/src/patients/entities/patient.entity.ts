import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * Read-only mapping of the legacy `patients` table.
 *
 * - `synchronize: false` (entity-level belt-and-braces; the connection also
 *   sets it globally) — this class can never alter the source schema.
 * - No ORM relations: child tables carry raw FK columns and relationships
 *   are resolved through ID-mapping records during Load (Phase 5).
 * - `date_of_birth` stays a `YYYY-MM-DD` string: Postgres `date` has no
 *   timezone, and hydrating it into a `Date` would invite TZ-shift bugs.
 */
@Entity({ name: 'patients', synchronize: false })
export class Patient {
  @PrimaryColumn({
    name: 'patient_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  patientId: number;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
