import { EntityManager } from 'typeorm';
import { EntityType } from '../../common/enums/entity-type.enum';
import { DuplicateClassification } from '../../validation/services/duplicate-detection.service';
import { ValidationError } from '../../validation/interfaces/validation-error.interface';

/** Parent ID maps used to translate child FKs from source to target IDs. */
export interface ForeignKeyMaps {
  doctor: Map<number, number>;
  patient: Map<number, number>;
  encounter: Map<number, number>;
}

export interface ValidatedOutcome {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * One entity's full Extract→Validate→Transform→Load contract.
 *
 * Internals are strongly typed per adapter; the engine drives pipelines
 * through `unknown` at this single, documented boundary so one engine can
 * orchestrate all six entities in dependency order without a 600-line switch.
 */
export interface EntityPipeline {
  readonly entityType: EntityType;
  readonly tableName: string;
  count(): Promise<number>;
  countTargets(): Promise<number>;
  countOrphans(): Promise<number>;
  extractBatch(afterId: number | null, size: number): Promise<unknown[]>;
  extractAll(size: number, startAfter: number | null): AsyncGenerator<unknown[], void, void>;
  extractByIds(ids: number[]): Promise<unknown[]>;
  getSourceId(record: unknown): number;
  getTargetId(saved: unknown): number;
  classifyDuplicates?(records: unknown[]): Map<number, DuplicateClassification>;
  /**
   * Optional global pre-pass (patients): builds the duplicate index over the
   * whole table before batching, so pairs split across batch boundaries are
   * still caught. The engine calls clear afterwards to free the memory.
   */
  buildDuplicateIndex?(): Promise<void>;
  clearDuplicateIndex?(): void;
  validate(record: unknown, duplicate?: DuplicateClassification): ValidatedOutcome;
  /** Target entity; child FK fields still hold SOURCE ids at this point. */
  transform(record: unknown): unknown;
  /**
   * Rewrites child FKs to target IDs using the parent maps.
   * Returns null on success, or a MISSING_FOREIGN_KEY message.
   */
  resolveForeignKeys(row: unknown, maps: ForeignKeyMaps): string | null;
  saveWithManager(manager: EntityManager, rows: unknown[]): Promise<unknown[]>;
}
