import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  controllers: [PlansController],
  providers: [PlansService],
  imports: [PrismaModule, PaymentModule],
})
export class PlansModule {}
