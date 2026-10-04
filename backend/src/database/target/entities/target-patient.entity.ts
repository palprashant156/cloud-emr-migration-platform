import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Target-side `patients`. Same columns as the legacy table, but the PK is a
 * fresh `serial` surrogate — target IDs deliberately differ from source IDs
 * (the RecordMapping table is the only bridge between the two).
 */
@Entity({ name: 'patients' })
export class TargetPatient {
  @PrimaryGeneratedColumn({ name: 'patient_id' })
  patientId!: number;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth!: string;

  @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
  gender!: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
