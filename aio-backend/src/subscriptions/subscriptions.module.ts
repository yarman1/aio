import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  imports: [PrismaModule, UsersModule, PaymentModule],
})
export class SubscriptionsModule {}
