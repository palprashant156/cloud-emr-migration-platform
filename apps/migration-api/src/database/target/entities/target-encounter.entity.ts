import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'encounters' })
export class TargetEncounter {
  @PrimaryGeneratedColumn({ name: 'encounter_id' })
  encounterId!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ name: 'encounter_date', type: 'timestamp' })
  encounterDate!: Date;

  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint!: string | null;

  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;
}
