import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'appointments' })
export class TargetAppointment {
  @PrimaryGeneratedColumn({ name: 'appointment_id' })
  appointmentId!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ name: 'appointment_date', type: 'timestamp' })
  appointmentDate!: Date;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: string;
}
