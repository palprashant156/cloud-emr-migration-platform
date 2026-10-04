import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotFoundFilter } from './common/filters/not-found.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Structured JSON-ish logs; Phase 7 adds correlation IDs (migrationId,
    // table, batch) to every line. Credentials are never logged.
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Unknown routes return actionable errors (e.g. GET /health/1 hints at
  // GET /health) instead of a bare "Cannot GET /x".
  app.useGlobalFilters(new NotFoundFilter());

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`migration-api listening on port ${port}`);
}

void bootstrap();
