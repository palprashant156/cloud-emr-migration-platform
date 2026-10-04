import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'doctors' })
export class TargetDoctor {
  @PrimaryGeneratedColumn({ name: 'doctor_id' })
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
