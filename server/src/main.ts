import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const express = app.getHttpAdapter().getInstance() as {
    set: (name: string, value: number) => void;
  };
  express.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(helmet());

  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    // Development default: allow the Expo web client from any origin.
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
