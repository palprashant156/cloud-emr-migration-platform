import { Injectable } from '@nestjs/common';
import { TargetDoctor } from '../../database/target/entities/target-doctor.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

/** Doctor transformation: trim all free text; license numbers pass through untouched. */
@Injectable()
export class DoctorTransformer implements EntityTransformer<Doctor, TargetDoctor> {
  transform(source: Doctor): TargetDoctor {
    const target = new TargetDoctor();
    target.firstName = source.firstName.trim();
    target.lastName = source.lastName.trim();
    target.specialization = source.specialization?.trim() || null;
    target.licenseNumber = source.licenseNumber?.trim() || null;
    target.createdAt = source.createdAt;
    return target;
  }
}
