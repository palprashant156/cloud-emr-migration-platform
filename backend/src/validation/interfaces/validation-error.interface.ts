import { MigrationErrorCode } from '../../common/enums/migration-error-code.enum';

/** Invalid records never disappear — they are captured in this shape. */
export type ValidationSeverity = 'ERROR' | 'WARNING';

export interface ValidationError {
  table: string;
  sourceId: number;
  field: string | null;
  errorCode: MigrationErrorCode;
  message: string;
  /**
   * ERROR blocks the record from loading (quarantined for review/retry).
   * WARNING migrates the record but flags it (e.g. POSSIBLE_DUPLICATE —
   * uncertain matches are never auto-merged).
   */
  severity: ValidationSeverity;
}
