import { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL `bigint` (int8) values arrive over the wire as **strings**
 * (the `pg` driver does this to avoid silent precision loss beyond
 * `Number.MAX_SAFE_INTEGER`).
 *
 * Our EMR surrogate keys are tiny (tens of thousands), so exposing them as
 * `number` is safe and keeps the rest of the codebase — keyset pagination,
 * ID-mapping, API responses — numeric. The guard below makes the assumption
 * explicit: any value outside the safe-integer range fails loudly instead of
 * corrupting an ID mapping.
 */
export const BigIntToNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null =>
    value === null || value === undefined ? null : value,

  from: (value: string | number | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(
        `bigint value "${value}" exceeds the JS safe-integer range; refusing to coerce`,
      );
    }
    return parsed;
  },
};
