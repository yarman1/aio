import { Module } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreatorsController } from './creators.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  controllers: [CreatorsController],
  providers: [CreatorsService],
  imports: [PrismaModule, UsersModule, PaymentModule, StorageModule],
})
export class CreatorsModule {}
