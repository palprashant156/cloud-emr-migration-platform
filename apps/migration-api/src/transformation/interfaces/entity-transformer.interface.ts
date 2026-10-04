/**
 * Single-record source→target transformer. Pure function of one row:
 * trim, normalize phone/email/enums — never validation (that already ran),
 * never FK resolution (the engine owns ID mapping).
 */
export interface EntityTransformer<Source, Target> {
  transform(source: Source): Target;
}
