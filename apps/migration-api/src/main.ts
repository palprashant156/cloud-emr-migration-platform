import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NotFoundFilter } from './common/filters/not-found.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
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

  const swagger = new DocumentBuilder()
    .setTitle('EMR Migration Platform')
    .setDescription('Legacy EMR PostgreSQL → AWS: extract, validate, transform, load, reconcile')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api-docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`migration-api listening on port ${port}`);
}

void bootstrap();
