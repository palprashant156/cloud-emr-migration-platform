import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';
import { PhoneNormalizationService } from './phone-normalization.service';

describe('PhoneNormalizationService', () => {
  const service = new PhoneNormalizationService();

  it.each([
    ['+91 9876543210'],
    ['+919876543210'],
    ['98765-43210'],
    ['09876543210'],
    ['919876543210'],
    [' 9876543210 '],
    ['+91-98765-43210'],
  ])('normalizes %p to E.164', (input) => {
    expect(service.normalize(input)).toEqual({
      original: input,
      normalized: '+919876543210',
      valid: true,
      errorCode: null,
    });
  });

  it.each([[null], [undefined], [''], ['   ']])('flags %p as MISSING_PHONE', (input) => {
    const result = service.normalize(input as unknown as null);
    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    expect(result.errorCode).toBe(MigrationErrorCode.MISSING_PHONE);
  });

  it.each([
    ['12345'], // too short
    ['987654321'], // 9 digits
    ['5876543210'], // valid length, outside 6-9 mobile range
    ['+1 4155552671'], // non-Indian country code
    ['abcdefghij'], // no digits at all
    ['91 987654321012'], // over-long
  ])('flags %p as INVALID_PHONE', (input) => {
    const result = service.normalize(input);
    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    expect(result.errorCode).toBe(MigrationErrorCode.INVALID_PHONE);
  });
});
