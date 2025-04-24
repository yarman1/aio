import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setup } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  setup(app);

  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT') || 3333;
  await app.listen(PORT);
}
bootstrap();
