import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { SourceDatabaseModule } from './database/source-database.module';
import { TargetDatabaseModule } from './database/target-database.module';
import { HealthModule } from './health/health.module';
import { MigrationModule } from './migration/migration.module';
import { PatientsModule } from './patients/patients.module';
import { ValidationModule } from './validation/validation.module';
/**
 * Root module. Each pipeline stage owns its module so no single service
 * grows into a 2,000-line god object.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // `.env` sits next to package.json in backend/.
      // Missing file is fine — pure-environment deployments (Docker/AWS)
      // work without it.
      envFilePath: ['.env'],
      load: [configuration],
      cache: true,
    }),
    SourceDatabaseModule,
    TargetDatabaseModule,
    HealthModule,
    PatientsModule,
    ValidationModule,
    MigrationModule,
  ],
})
export class AppModule {}
