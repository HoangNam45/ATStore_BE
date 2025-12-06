import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
