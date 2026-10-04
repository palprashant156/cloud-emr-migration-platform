import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { EmailValidationService } from './email-validation.service';

describe('EmailValidationService', () => {
  const service = new EmailValidationService();

  it('accepts a normal address unchanged', () => {
    expect(service.validate('patient.1@example.com')).toEqual({
      original: 'patient.1@example.com',
      normalized: 'patient.1@example.com',
      valid: true,
      errorCode: null,
    });
  });

  it('trims and lowercases before accepting', () => {
    const result = service.validate('  PATIENT@Example.COM ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('patient@example.com');
  });

  it.each([['patient@'], ['patient.example.com'], ['patient@.com'], ['patient@@gmail.com'], ['@gmail.com']])(
    'flags %p as INVALID_EMAIL',
    (input) => {
      const result = service.validate(input);
      expect(result.valid).toBe(false);
      expect(result.normalized).toBeNull();
      expect(result.errorCode).toBe(MigrationErrorCode.INVALID_EMAIL);
    },
  );

  it.each([['a@b@c.com'], ['plain address'], ['user@domain'], ['user@domain.c'], ['user..x@example.com'], ['user@exa mple.com']])(
    'flags %p as INVALID_EMAIL',
    (input) => {
      expect(service.validate(input).errorCode).toBe(MigrationErrorCode.INVALID_EMAIL);
    },
  );

  it.each([[null], [undefined], [''], ['   ']])('flags %p as missing, not malformed', (input) => {
    const result = service.validate(input as unknown as null);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(MigrationErrorCode.MISSING_REQUIRED_FIELD);
  });
});
