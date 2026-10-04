/**
 * Central application configuration.
 *
 * All secrets come from environment variables — nothing is hard-coded.
 * Defaults match the local legacy EMR PostgreSQL setup so the app runs
 * out of the box for development:
 *   host=localhost, port=5432, database=emr_source
 */
export interface SourceDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface TargetDatabaseConfig extends SourceDatabaseConfig {
  /**
   * TypeORM schema sync for the target (which we own — unlike the source).
   * True in development for velocity; MUST be false in production, where
   * schema changes ship as reviewed migrations (see infrastructure/aws).
   */
  synchronize: boolean;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  sourceDatabase: SourceDatabaseConfig;
  targetDatabase: TargetDatabaseConfig;
}

function requireNonEmpty(value: string | undefined, name: string): void {
  if (value !== undefined && value.trim() === '') {
    throw new Error(`Environment variable ${name} must not be empty`);
  }
}

function parsePort(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Environment variable ${name} must be a valid TCP port, got "${value}"`);
  }
  return parsed;
}

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const sourceDbName = process.env.SOURCE_DB_NAME ?? 'emr_source';
  requireNonEmpty(process.env.SOURCE_DB_HOST, 'SOURCE_DB_HOST');
  requireNonEmpty(process.env.SOURCE_DB_USERNAME, 'SOURCE_DB_USERNAME');
  requireNonEmpty(process.env.SOURCE_DB_NAME, 'SOURCE_DB_NAME');

  // Local target defaults to the `emr_target` database; in AWS this same
  // block points at RDS — no code changes, only environment.
  const targetSynchronize =
    process.env.TARGET_DB_SYNCHRONIZE ?? (nodeEnv === 'production' ? 'false' : 'true');

  return {
    nodeEnv,
    port: parsePort(process.env.PORT, 'PORT', 3000),
    sourceDatabase: {
      host: process.env.SOURCE_DB_HOST ?? 'localhost',
      port: parsePort(process.env.SOURCE_DB_PORT, 'SOURCE_DB_PORT', 5432),
      username: process.env.SOURCE_DB_USERNAME ?? 'postgres',
      // Local Postgres commonly uses trust/peer auth; empty password is valid there.
      // Production must always set a real password via the environment.
      password: process.env.SOURCE_DB_PASSWORD ?? '',
      database: sourceDbName,
    },
    targetDatabase: {
      host: process.env.TARGET_DB_HOST ?? 'localhost',
      port: parsePort(process.env.TARGET_DB_PORT, 'TARGET_DB_PORT', 5432),
      username: process.env.TARGET_DB_USERNAME ?? 'postgres',
      password: process.env.TARGET_DB_PASSWORD ?? '',
      database: process.env.TARGET_DB_NAME ?? 'emr_target',
      synchronize: targetSynchronize === 'true',
    },
  };
};
