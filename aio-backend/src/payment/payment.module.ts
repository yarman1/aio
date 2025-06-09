import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentWebhookService } from './payment.webhook.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [PaymentController],
  providers: [
    PaymentWebhookService,
    {
      provide: 'StripeClient',
      useFactory: (configService: ConfigService) => {
        return new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
          apiVersion: '2025-03-31.basil',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['StripeClient'],
})
export class PaymentModule {}
