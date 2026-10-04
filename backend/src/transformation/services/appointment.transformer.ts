import { Injectable } from '@nestjs/common';
import { TargetAppointment } from '../../database/target/entities/target-appointment.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

/**
 * Appointment transformation. `patientId`/`doctorId` still hold SOURCE ids
 * here — the engine swaps them for target IDs after mapping lookup.
 */
@Injectable()
export class AppointmentTransformer implements EntityTransformer<Appointment, TargetAppointment> {
  transform(source: Appointment): TargetAppointment {
    const target = new TargetAppointment();
    target.patientId = source.patientId;
    target.doctorId = source.doctorId;
    target.appointmentDate = source.appointmentDate;
    target.status = source.status.trim().toUpperCase();
    return target;
  }
}
