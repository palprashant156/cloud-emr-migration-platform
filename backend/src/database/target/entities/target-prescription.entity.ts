import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'prescriptions' })
export class TargetPrescription {
  @PrimaryGeneratedColumn({ name: 'prescription_id' })
  prescriptionId!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ name: 'medicine_name', type: 'varchar', length: 255 })
  medicineName!: string;

  @Column({ name: 'dosage', type: 'varchar', length: 100, nullable: true })
  dosage!: string | null;

  @Column({ name: 'frequency', type: 'varchar', length: 100, nullable: true })
  frequency!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;
}
