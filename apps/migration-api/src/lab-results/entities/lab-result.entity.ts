import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BigIntToNumberTransformer } from '../../common/transformers/bigint.transformer';

/**
 * Read-only mapping of the legacy `lab_results` table.
 * `encounter_id` is nullable in the source — preserved as-is.
 */
@Entity({ name: 'lab_results', synchronize: false })
export class LabResult {
  @PrimaryColumn({
    name: 'lab_result_id',
    type: 'bigint',
    transformer: BigIntToNumberTransformer,
  })
  labResultId: number;

  @Column({ name: 'patient_id', type: 'bigint', transformer: BigIntToNumberTransformer })
  patientId: number;

  @Column({
    name: 'encounter_id',
    type: 'bigint',
    nullable: true,
    transformer: BigIntToNumberTransformer,
  })
  encounterId: number | null;

  @Column({ name: 'test_name', type: 'varchar', length: 255 })
  testName: string;

  @Column({ name: 'test_value', type: 'varchar', length: 255, nullable: true })
  testValue: string | null;

  @Column({ name: 'unit', type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ name: 'reference_range', type: 'varchar', length: 100, nullable: true })
  referenceRange: string | null;

  @Column({ name: 'result_date', type: 'timestamp', nullable: true })
  resultDate: Date | null;
}
