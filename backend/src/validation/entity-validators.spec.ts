import { Appointment } from '../appointments/entities/appointment.entity';
import { MigrationErrorCode } from '../common/enums/migration-error-code.enum';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Encounter } from '../encounters/entities/encounter.entity';
import { LabResult } from '../lab-results/entities/lab-result.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { AppointmentValidatorService } from './services/appointment-validator.service';
import { DoctorValidatorService } from './services/doctor-validator.service';
import { EncounterValidatorService } from './services/encounter-validator.service';
import { LabResultValidatorService } from './services/lab-result-validator.service';
import { PrescriptionValidatorService } from './services/prescription-validator.service';

describe('entity validators', () => {
  it('doctor: requires names + license', () => {
    const v = new DoctorValidatorService();
    expect(v.validate({ firstName: 'A', lastName: 'B', licenseNumber: 'L1' } as Doctor).valid).toBe(true);
    const bad = v.validate({ firstName: '', lastName: 'B', licenseNumber: null } as Doctor);
    expect(bad.valid).toBe(false);
    expect(bad.errors.map((e) => e.errorCode)).toEqual(
      expect.arrayContaining([MigrationErrorCode.MISSING_REQUIRED_FIELD]),
    );
  });

  it('appointment: accepts the three legacy statuses case-insensitively, rejects others', () => {
    const v = new AppointmentValidatorService();
    const good = (status: string) =>
      v.validate({ appointmentDate: new Date(), status } as Appointment).valid;
    expect(good('scheduled')).toBe(true);
    expect(good('COMPLETED')).toBe(true);
    expect(good('Cancelled')).toBe(true);
    const bad = v.validate({ appointmentDate: new Date(), status: 'NO_SHOW' } as Appointment);
    expect(bad.valid).toBe(false);
    expect(bad.errors[0].errorCode).toBe(MigrationErrorCode.INVALID_STATUS);
  });

  it('encounter: requires a real date', () => {
    const v = new EncounterValidatorService();
    expect(v.validate({ encounterDate: new Date() } as Encounter).valid).toBe(true);
    expect(v.validate({ encounterDate: null } as unknown as Encounter).valid).toBe(false);
  });

  it('prescription: requires medicine, coherent dates', () => {
    const v = new PrescriptionValidatorService();
    expect(
      v.validate({ medicineName: 'PCM', startDate: '2024-01-01', endDate: '2024-01-10' } as Prescription).valid,
    ).toBe(true);
    const bad = v.validate({ medicineName: '', startDate: '2024-02-01', endDate: '2024-01-01' } as Prescription);
    expect(bad.valid).toBe(false);
    expect(bad.errors.map((e) => e.errorCode)).toEqual(
      expect.arrayContaining([MigrationErrorCode.MISSING_REQUIRED_FIELD, MigrationErrorCode.INVALID_DATE]),
    );
  });

  it('lab result: requires a test name', () => {
    const v = new LabResultValidatorService();
    expect(v.validate({ testName: 'CBC' } as LabResult).valid).toBe(true);
    expect(v.validate({ testName: '  ' } as LabResult).valid).toBe(false);
  });
});
