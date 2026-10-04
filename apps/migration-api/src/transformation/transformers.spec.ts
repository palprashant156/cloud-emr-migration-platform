import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Encounter } from '../encounters/entities/encounter.entity';
import { LabResult } from '../lab-results/entities/lab-result.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { EmailValidationService } from '../validation/services/email-validation.service';
import { PhoneNormalizationService } from '../validation/services/phone-normalization.service';
import { AppointmentTransformer } from './services/appointment.transformer';
import { DoctorTransformer } from './services/doctor.transformer';
import { EncounterTransformer } from './services/encounter.transformer';
import { LabResultTransformer } from './services/lab-result.transformer';
import { PatientTransformer } from './services/patient.transformer';
import { PrescriptionTransformer } from './services/prescription.transformer';

const phones = new PhoneNormalizationService();
const emails = new EmailValidationService();

describe('transformers', () => {
  it('patient: trims, E.164 phone, lowercase email, canonical gender', () => {
    const out = new PatientTransformer(phones, emails).transform({
      firstName: '  Aarav ',
      lastName: 'Sharma',
      dateOfBirth: '1990-05-01',
      gender: 'male',
      phone: '09876543210',
      email: 'AARAV@Example.COM',
      address: '  Bengaluru  ',
    } as Patient);
    expect(out).toMatchObject({
      firstName: 'Aarav',
      phone: '+919876543210',
      email: 'aarav@example.com',
      gender: 'Male',
      address: 'Bengaluru',
    });
  });

  it('patient: invalid phone/email degrade to null (validation already blocked the row)', () => {
    const out = new PatientTransformer(phones, emails).transform({
      firstName: 'A',
      lastName: 'B',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phone: '123',
      email: 'bad',
      address: null,
    } as Patient);
    expect(out.phone).toBeNull();
    expect(out.email).toBeNull();
  });

  it('doctor: trims free text, preserves license verbatim', () => {
    const out = new DoctorTransformer().transform({
      firstName: ' Meera ',
      lastName: 'Iyer',
      specialization: ' Cardiology ',
      licenseNumber: 'MCI-123',
    } as Doctor);
    expect(out).toMatchObject({ firstName: 'Meera', specialization: 'Cardiology', licenseNumber: 'MCI-123' });
  });

  it('appointment: uppercases status, keeps source FKs for the engine', () => {
    const out = new AppointmentTransformer().transform({
      patientId: 251,
      doctorId: 3,
      status: ' scheduled ',
    } as Appointment);
    expect(out).toMatchObject({ patientId: 251, doctorId: 3, status: 'SCHEDULED' });
  });

  it('encounter/prescription/lab: trim text, keep source FKs', () => {
    const enc = new EncounterTransformer().transform({
      patientId: 1,
      doctorId: 2,
      chiefComplaint: ' fever ',
      diagnosis: null,
      notes: '  rest  ',
    } as Encounter);
    expect(enc).toMatchObject({ patientId: 1, chiefComplaint: 'fever', diagnosis: null, notes: 'rest' });

    const rx = new PrescriptionTransformer().transform({
      patientId: 1,
      doctorId: 2,
      medicineName: ' Paracetamol ',
      dosage: null,
    } as Prescription);
    expect(rx).toMatchObject({ medicineName: 'Paracetamol', dosage: null });

    const lab = new LabResultTransformer().transform({
      patientId: 1,
      encounterId: 7,
      testName: ' HbA1c ',
    } as LabResult);
    expect(lab).toMatchObject({ testName: 'HbA1c', encounterId: 7 });
  });
});
