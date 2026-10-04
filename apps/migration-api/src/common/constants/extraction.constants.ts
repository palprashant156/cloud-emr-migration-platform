/** Default rows per extraction batch: 1,000 keeps memory flat at any table size. */
export const DEFAULT_BATCH_SIZE = 1000;
/** Hard ceiling for any single batch read. */
export const MAX_BATCH_SIZE = 5000;
/** Rows per target INSERT transaction — one batch, one commit, never the whole table. */
export const LOAD_CHUNK_SIZE = 500;
/** Load attempts per record before it is marked PERMANENT. */
export const MAX_LOAD_ATTEMPTS = 3;
