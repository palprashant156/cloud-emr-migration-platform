import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/** Read-only mapping of the legacy `encounters` table. */
@Entity({ name: 'encounters', synchronize: false })
export class Encounter {
  @PrimaryColumn({
    name: 'encounter_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  encounterId: number;

  @Column({ name: 'patient_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  patientId: number;

  @Column({ name: 'doctor_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  doctorId: number;

  @Column({ name: 'encounter_date', type: 'timestamp' })
  encounterDate: Date;

  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint: string | null;

  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
