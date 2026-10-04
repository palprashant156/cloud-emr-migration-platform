import { Injectable } from '@nestjs/common';
import { TargetPatient } from '../../database/target/entities/target-patient.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { EmailValidationService } from '../../validation/services/email-validation.service';
import { PhoneNormalizationService } from '../../validation/services/phone-normalization.service';
import { EntityTransformer } from '../interfaces/entity-transformer.interface';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Patient transformation: trim, E.164 phone, lowercase email, canonical gender. */
@Injectable()
export class PatientTransformer implements EntityTransformer<Patient, TargetPatient> {
  constructor(
    private readonly phones: PhoneNormalizationService,
    private readonly emails: EmailValidationService,
  ) {}

  transform(source: Patient): TargetPatient {
    const phone = this.phones.normalize(source.phone);
    const email = this.emails.validate(source.email);
    const target = new TargetPatient();
    target.firstName = source.firstName.trim();
    target.lastName = source.lastName.trim();
    target.dateOfBirth = source.dateOfBirth.trim();
    target.gender = source.gender ? capitalize(source.gender.trim()) : source.gender;
    target.phone = phone.valid ? phone.normalized : null;
    target.email = email.valid ? email.normalized : null;
    target.address = source.address?.trim() || null;
    // Source timestamps are preserved — they are the audit trail of the legacy system.
    target.createdAt = source.createdAt;
    target.updatedAt = source.updatedAt;
    return target;
  }
}
