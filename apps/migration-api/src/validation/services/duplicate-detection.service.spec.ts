import {
  DuplicateCandidate,
  DuplicateDetectionService,
} from './duplicate-detection.service';
import { PhoneNormalizationService } from './phone-normalization.service';

const base: DuplicateCandidate = {
  sourceId: 1,
  firstName: 'Aarav',
  lastName: 'Sharma',
  dateOfBirth: '1990-05-01',
  phone: '+919876543210',
  email: 'aarav@example.com',
};

describe('DuplicateDetectionService', () => {
  const service = new DuplicateDetectionService(new PhoneNormalizationService());

  it('marks byte-identical rows as CONFIRMED_DUPLICATE after the first', () => {
    const [first, second] = service.classifyAll([base, { ...base, sourceId: 2 }]);
    expect(first.status).toBe('UNIQUE');
    expect(second).toMatchObject({
      status: 'CONFIRMED_DUPLICATE',
      matchReason: 'EXACT_MATCH',
      matchedSourceId: 1,
    });
  });

  it('catches normalized variants (case, whitespace, phone format)', () => {
    const variant: DuplicateCandidate = {
      ...base,
      sourceId: 2,
      firstName: '  AARAV ',
      email: '  Aarav@Example.com ',
      phone: '09876543210',
    };
    const [, second] = service.classifyAll([base, variant]);
    expect(second.status).toBe('CONFIRMED_DUPLICATE');
    expect(second.matchedSourceId).toBe(1);
  });

  it('flags same name+DOB with different contacts as POSSIBLE, not confirmed', () => {
    const other: DuplicateCandidate = {
      ...base,
      sourceId: 2,
      phone: '+919999999999',
      email: 'other@example.com',
    };
    const [, second] = service.classifyAll([base, other]);
    expect(second).toMatchObject({ status: 'POSSIBLE_DUPLICATE', matchReason: 'NAME_DOB' });
  });

  it('prefers EMAIL_DOB over NAME_DOB when both match', () => {
    const other: DuplicateCandidate = {
      sourceId: 2,
      firstName: 'Different',
      lastName: 'Person',
      dateOfBirth: '1990-05-01',
      phone: null,
      email: 'aarav@example.com',
    };
    const [, second] = service.classifyAll([base, other]);
    expect(second).toMatchObject({ status: 'POSSIBLE_DUPLICATE', matchReason: 'EMAIL_DOB' });
  });

  it('matches on PHONE_DOB when name and email differ', () => {
    const other: DuplicateCandidate = {
      sourceId: 2,
      firstName: 'Different',
      lastName: 'Person',
      dateOfBirth: '1990-05-01',
      phone: '98765-43210',
      email: 'different@example.com',
    };
    const [, second] = service.classifyAll([base, other]);
    expect(second).toMatchObject({ status: 'POSSIBLE_DUPLICATE', matchReason: 'PHONE_DOB' });
  });

  it('leaves genuinely distinct records UNIQUE and never matches on missing phones', () => {
    const a: DuplicateCandidate = { ...base, sourceId: 1, phone: null, email: 'a@example.com' };
    const b: DuplicateCandidate = {
      sourceId: 2,
      firstName: 'Ishaan',
      lastName: 'Verma',
      dateOfBirth: '1985-11-20',
      phone: null,
      email: 'b@example.com',
    };
    const [first, second] = service.classifyAll([a, b]);
    expect(first.status).toBe('UNIQUE');
    expect(second.status).toBe('UNIQUE');
  });
});
