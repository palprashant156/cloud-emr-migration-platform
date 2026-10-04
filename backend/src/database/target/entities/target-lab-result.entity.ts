import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'lab_results' })
export class TargetLabResult {
  @PrimaryGeneratedColumn({ name: 'lab_result_id' })
  labResultId!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'encounter_id', type: 'int', nullable: true })
  encounterId!: number | null;

  @Column({ name: 'test_name', type: 'varchar', length: 255 })
  testName!: string;

  @Column({ name: 'test_value', type: 'varchar', length: 255, nullable: true })
  testValue!: string | null;

  @Column({ name: 'unit', type: 'varchar', length: 50, nullable: true })
  unit!: string | null;

  @Column({ name: 'reference_range', type: 'varchar', length: 100, nullable: true })
  referenceRange!: string | null;

  @Column({ name: 'result_date', type: 'timestamp', nullable: true })
  resultDate!: Date | null;
}
