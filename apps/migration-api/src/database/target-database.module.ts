import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TARGET_ENTITIES } from './target.entities';

export const TARGET_DATA_SOURCE_NAME = 'target';

/**
 * TargetDatabaseModule — READ/WRITE access to the migration target.
 * Locally this is the `emr_target` database; in AWS it becomes RDS Postgres
 * with zero code changes (host/credentials are environment-driven).
 *
 * Unlike the source connection, the target schema is owned by this
 * application: `synchronize` is enabled outside production so target +
 * metadata tables are created automatically. Production must set
 * TARGET_DB_SYNCHRONIZE=false and apply reviewed migrations instead.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: TARGET_DATA_SOURCE_NAME,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: TARGET_DATA_SOURCE_NAME,
        type: 'postgres',
        host: config.get<string>('targetDatabase.host', 'localhost'),
        port: config.get<number>('targetDatabase.port', 5432),
        username: config.get<string>('targetDatabase.username', 'postgres'),
        password: config.get<string>('targetDatabase.password', ''),
        database: config.get<string>('targetDatabase.database', 'emr_target'),
        entities: TARGET_ENTITIES,
        synchronize: config.get<boolean>('targetDatabase.synchronize', true),
        migrationsRun: false,
        extra: { max: 20 },
        logging: false,
      }),
    }),
  ],
})
export class TargetDatabaseModule {}
