import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

export function setup(app: INestApplication) {
  const configService = app.get(ConfigService);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
      excludeExtraneousValues: true,
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  const origins = configService
    .get<string>('ORIGINS')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({
    origin: origins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'x-api-key',
      'x-client-type',
      'x-refresh-token',
      'x-device-id',
      'ngrok-skip-browser-warning',
    ],
    credentials: true,
  });

  const swaggerBasePath = configService.get('SWAGGER_BASE_PATH') || '/swagger';
  const config = new DocumentBuilder()
    .setTitle('AIO API')
    .setDescription('Api description')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addSecurityRequirements('x-api-key')
    .addBearerAuth()
    .addServer(swaggerBasePath)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: '/api-json',
  });

  return app;
}
