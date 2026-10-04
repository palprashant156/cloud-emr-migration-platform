import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { Patient } from '../../patients/entities/patient.entity';
import { DuplicateClassification } from './duplicate-detection.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { EmailValidationService } from './email-validation.service';
import { PatientValidatorService } from './patient-validator.service';
import { PhoneNormalizationService } from './phone-normalization.service';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    patientId: 1,
    firstName: 'Aarav',
    lastName: 'Sharma',
    dateOfBirth: '1990-05-01',
    gender: 'Male',
    phone: '+919876543210',
    email: 'aarav@example.com',
    address: 'Bengaluru',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Patient;
}

describe('PatientValidatorService', () => {
  const phones = new PhoneNormalizationService();
  const service = new PatientValidatorService(phones, new EmailValidationService());
  const duplicates = new DuplicateDetectionService(phones);

  it('accepts a clean record with no errors', () => {
    const result = service.validate(patient());
    expect(result).toEqual({ sourceId: 1, valid: true, errors: [] });
  });

  it('reports missing names as MISSING_REQUIRED_FIELD', () => {
    const result = service.validate(patient({ firstName: '  ' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        table: 'patients',
        sourceId: 1,
        field: 'first_name',
        errorCode: MigrationErrorCode.MISSING_REQUIRED_FIELD,
      }),
    );
  });

  it.each([[null], [''], ['2099-01-01'], ['1990-13-40'], ['01-05-1990'], ['1800-01-01']])(
    'rejects date_of_birth %p',
    (dob) => {
      const result = service.validate(patient({ dateOfBirth: dob as unknown as string }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'date_of_birth')).toBe(true);
    },
  );

  it('rejects unknown gender but accepts any casing of Male/Female/Other', () => {
    expect(service.validate(patient({ gender: 'FEMALE' })).valid).toBe(true);
    const result = service.validate(patient({ gender: 'Unknown' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.errorCode === MigrationErrorCode.INVALID_GENDER)).toBe(true);
  });

  it('surfaces phone and email problems with the specified error shape', () => {
    const result = service.validate(patient({ phone: null, email: 'patient@' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      table: 'patients',
      sourceId: 1,
      field: 'phone',
      errorCode: MigrationErrorCode.MISSING_PHONE,
      message: 'Phone number is missing',
      severity: 'ERROR',
    });
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'email', errorCode: MigrationErrorCode.INVALID_EMAIL }),
    );
  });

  it('blocks confirmed duplicates but only warns on possible ones', () => {
    const [unique, confirmed] = duplicates.classifyAll([
      { sourceId: 1, firstName: 'Aarav', lastName: 'Sharma', dateOfBirth: '1990-05-01', phone: '+919876543210', email: 'aarav@example.com' },
      { sourceId: 2, firstName: 'aarav', lastName: 'sharma', dateOfBirth: '1990-05-01', phone: '09876543210', email: 'AARAV@EXAMPLE.COM' },
    ]);
    expect(unique.status).toBe('UNIQUE');
    const blocked = service.validate(patient({ patientId: 2 }), confirmed);
    expect(blocked.valid).toBe(false);
    expect(blocked.errors.some((e) => e.errorCode === MigrationErrorCode.DUPLICATE_PATIENT)).toBe(true);

    const possible: DuplicateClassification = {
      sourceId: 3,
      status: 'POSSIBLE_DUPLICATE',
      matchReason: 'NAME_DOB',
      matchedSourceId: 1,
    };
    const warned = service.validate(patient({ patientId: 3 }), possible);
    expect(warned.valid).toBe(true);
    expect(warned.errors).toContainEqual(
      expect.objectContaining({ errorCode: MigrationErrorCode.POSSIBLE_DUPLICATE, severity: 'WARNING' }),
    );
  });
});
