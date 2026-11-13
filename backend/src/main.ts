import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    // `transform` + `enableImplicitConversion` convertissent les query strings
    // (Type) et `@Type()` couvre les scalaires. Les listes acceptent le format
    // répété (?workMode=REMOTE&workMode=HYBRID) ou séparé par virgules.
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
    }),
  );

  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:4200');
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '0.0.0.0');

  logger.log(`API JobRadar disponible sur http://localhost:${port}/api`);
  logger.log(`Healthcheck : http://localhost:${port}/api/health`);
}

void bootstrap();
