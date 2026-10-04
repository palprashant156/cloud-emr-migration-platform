import { Injectable } from '@nestjs/common';
import { TargetPrescription } from '../../database/target/entities/target-prescription.entity';
import { Prescription } from '../../prescriptions/entities/prescription.entity';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

/** Prescription transformation. FKs still hold SOURCE ids (engine translates them). */
@Injectable()
export class PrescriptionTransformer implements EntityTransformer<Prescription, TargetPrescription> {
  transform(source: Prescription): TargetPrescription {
    const target = new TargetPrescription();
    target.patientId = source.patientId;
    target.doctorId = source.doctorId;
    target.medicineName = source.medicineName.trim();
    target.dosage = source.dosage?.trim() || null;
    target.frequency = source.frequency?.trim() || null;
    target.startDate = source.startDate?.trim() || null;
    target.endDate = source.endDate?.trim() || null;
    return target;
  }
}
