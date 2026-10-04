import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { SourceDatabaseModule } from './database/source-database.module';
import { HealthModule } from './health/health.module';
import { PatientsModule } from './patients/patients.module';

/**
 * Root module — Phase 1 wiring only.
 *
 * Phase 2+ will register PatientsModule, ValidationModule, MigrationModule,
 * TargetDatabaseModule, ReconciliationModule, etc. Each stage of the
 * Extract → Validate → Transform → Load pipeline gets its own module so
 * no single service grows into a 2,000-line god object.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // `.env` sits next to package.json in apps/migration-api/.
      // Missing file is fine — pure-environment deployments (Docker/AWS)
      // work without it.
      envFilePath: ['.env'],
      load: [configuration],
      cache: true,
    }),
    SourceDatabaseModule,
    HealthModule,
    PatientsModule,
  ],
})
export class AppModule {}
