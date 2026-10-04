import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Encounter } from '../encounters/entities/encounter.entity';
import { LabResult } from '../lab-results/entities/lab-result.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import configuration from '../config/configuration';

/**
 * Name of the TypeORM DataSource bound to the legacy EMR database.
 *
 * A named connection is used deliberately: Phase 4 will add a second
 * connection named `target` (AWS RDS / local target PostgreSQL).
 * Naming the source connection from day one prevents the classic bug of
 * accidentally writing migration output into the read-only source DB.
 */
export const SOURCE_DATA_SOURCE_NAME = 'source';

/**
 * SourceDatabaseModule — READ-ONLY access to the legacy EMR PostgreSQL.
 *
 * Safety guarantees:
 * - `synchronize: false` — TypeORM will never create/alter source tables.
 * - `migrationsRun: false` — no migrations run against the source.
 * - No entity is registered with write repositories in migration code;
 *   extractors (Phase 2+) use read-only queries / EntityManager queries.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: SOURCE_DATA_SOURCE_NAME,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: SOURCE_DATA_SOURCE_NAME,
        type: 'postgres',
        host: config.get<string>('sourceDatabase.host', 'localhost'),
        port: config.get<number>('sourceDatabase.port', 5432),
        username: config.get<string>('sourceDatabase.username', 'postgres'),
        password: config.get<string>('sourceDatabase.password', ''),
        database: config.get<string>('sourceDatabase.database', 'emr_source'),
        // Read-only source entities (Phase 2). No target entities ever go here.
        entities: [Patient, Doctor, Appointment, Encounter, Prescription, LabResult],
        synchronize: false,
        migrationsRun: false,
        // DB containers (docker-compose / RDS) are often briefly unreachable
        // at API startup. Retry instead of crashing on the first failure;
        // persistent misconfiguration still fails fast after these attempts.
        retryAttempts: 10,
        retryDelay: 3000,
        // Pool sized for a migration API + batched extractors, not for
        // holding thousands of idle connections.
        extra: {
          max: 10,
        },
        // Never log the password; query logging stays off by default.
        logging: false,
      }),
    }),
  ],
})
export class SourceDatabaseModule {}
