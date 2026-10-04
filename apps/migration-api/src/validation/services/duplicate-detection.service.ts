import { Injectable } from '@nestjs/common';
import { PhoneNormalizationService } from './phone-normalization.service';

export type DuplicateStatus = 'UNIQUE' | 'CONFIRMED_DUPLICATE' | 'POSSIBLE_DUPLICATE';
export type DuplicateMatchReason = 'EXACT_MATCH' | 'EMAIL_DOB' | 'PHONE_DOB' | 'NAME_DOB' | null;

export interface DuplicateCandidate {
  sourceId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string | null;
  email: string | null;
}

export interface DuplicateClassification {
  sourceId: number;
  status: DuplicateStatus;
  matchReason: DuplicateMatchReason;
  /** The surviving record this candidate duplicates, if any. */
  matchedSourceId: number | null;
}

interface NormalizedKeys {
  exact: string;
  emailDob: string | null;
  phoneDob: string | null;
  nameDob: string;
}

/**
 * Two-level duplicate detection over a candidate set.
 *
 * Pass 1 — exact (normalized) match on first+last+DOB+phone+email.
 * Normalization before comparing (trim, lowercase, E.164 phone) is what
 * catches `+91 98765 43210` vs `09876543210` as the same person.
 * The first occurrence survives; later ones are CONFIRMED_DUPLICATE.
 *
 * Pass 2 — possible match on EMAIL+DOB, PHONE+DOB, or NAME+DOB against a
 * *different* record. These are POSSIBLE_DUPLICATE: flagged for human review,
 * never auto-merged (merging two distinct patients' medical histories would
 * be a safety incident, not a cleanup).
 *
 * Stateless and pure: the caller supplies the candidate window. Cross-batch
 * persistence of seen keys is a Phase-5 (migration run) concern.
 */
@Injectable()
export class DuplicateDetectionService {
  constructor(private readonly phones: PhoneNormalizationService) {}

  classifyAll(candidates: DuplicateCandidate[]): DuplicateClassification[] {
    const keys = new Map<number, NormalizedKeys>();
    for (const candidate of candidates) {
      keys.set(candidate.sourceId, this.buildKeys(candidate));
    }

    const firstByExact = new Map<string, number>();
    const result = new Map<number, DuplicateClassification>();
    for (const candidate of candidates) {
      const exact = keys.get(candidate.sourceId)?.exact ?? '';
      const first = firstByExact.get(exact);
      if (first === undefined) {
        firstByExact.set(exact, candidate.sourceId);
        result.set(candidate.sourceId, {
          sourceId: candidate.sourceId,
          status: 'UNIQUE',
          matchReason: null,
          matchedSourceId: null,
        });
      } else {
        result.set(candidate.sourceId, {
          sourceId: candidate.sourceId,
          status: 'CONFIRMED_DUPLICATE',
          matchReason: 'EXACT_MATCH',
          matchedSourceId: first,
        });
      }
    }

    // Possible-key index over the surviving (first-occurrence) records.
    const possibleIndex = new Map<string, { reason: Exclude<DuplicateMatchReason, null | 'EXACT_MATCH'>; sourceId: number }>();
    for (const survivorId of firstByExact.values()) {
      const k = keys.get(survivorId);
      if (!k) {
        continue;
      }
      if (k.emailDob !== null && !possibleIndex.has(`email|${k.emailDob}`)) {
        possibleIndex.set(`email|${k.emailDob}`, { reason: 'EMAIL_DOB', sourceId: survivorId });
      }
      if (k.phoneDob !== null && !possibleIndex.has(`phone|${k.phoneDob}`)) {
        possibleIndex.set(`phone|${k.phoneDob}`, { reason: 'PHONE_DOB', sourceId: survivorId });
      }
      if (!possibleIndex.has(`name|${k.nameDob}`)) {
        possibleIndex.set(`name|${k.nameDob}`, { reason: 'NAME_DOB', sourceId: survivorId });
      }
    }

    for (const candidate of candidates) {
      const current = result.get(candidate.sourceId);
      if (!current || current.status !== 'UNIQUE') {
        continue;
      }
      const k = keys.get(candidate.sourceId);
      if (!k) {
        continue;
      }
      const lookups: Array<string | null> = [
        k.emailDob !== null ? `email|${k.emailDob}` : null,
        k.phoneDob !== null ? `phone|${k.phoneDob}` : null,
        `name|${k.nameDob}`,
      ];
      for (const lookup of lookups) {
        if (lookup === null) {
          continue;
        }
        const hit = possibleIndex.get(lookup);
        if (hit && hit.sourceId !== candidate.sourceId) {
          result.set(candidate.sourceId, {
            sourceId: candidate.sourceId,
            status: 'POSSIBLE_DUPLICATE',
            matchReason: hit.reason,
            matchedSourceId: hit.sourceId,
          });
          break;
        }
      }
    }

    return candidates.map((candidate) => {
      const classification = result.get(candidate.sourceId);
      if (!classification) {
        throw new Error(`missing classification for source ${candidate.sourceId}`);
      }
      return classification;
    });
  }

  /** Normalized match keys for one candidate (public for the migration engine's global index). */
  buildKeys(candidate: DuplicateCandidate): NormalizedKeys {
    const first = candidate.firstName.trim().toLowerCase();
    const last = candidate.lastName.trim().toLowerCase();
    const dob = candidate.dateOfBirth.trim();
    const email = candidate.email?.trim().toLowerCase() || null;
    const phoneResult = this.phones.normalize(candidate.phone);
    // Only valid normalized phones participate in keys — two records sharing
    // a malformed phone string must not count as "same phone".
    const phone = phoneResult.valid ? phoneResult.normalized : null;
    const nameDob = `${first}|${last}|${dob}`;
    return {
      exact: `${nameDob}|${phone ?? ''}|${email ?? ''}`,
      emailDob: email ? `${email}|${dob}` : null,
      phoneDob: phone ? `${phone}|${dob}` : null,
      nameDob,
    };
  }
}
