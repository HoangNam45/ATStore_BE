import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow larger payloads for image uploads to avoid 413 responses
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove extra fields
      forbidNonWhitelisted: true, // Throw error if extra fields
      transform: true, // Transform payload to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically (e.g. string → number)
      },
    }),
  );
  app.use(helmet());
  app.enableCors({
    origin: [
      `${process.env.FRONTEND_URL}`,
      'https://aryan-tufaceous-coquettishly.ngrok-free.dev',
      'http://localhost:3000',
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Content-Length',
      'ngrok-skip-browser-warning',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
