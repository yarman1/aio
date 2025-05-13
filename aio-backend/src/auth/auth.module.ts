import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AtGuard, RolesGuard } from './guards';
import { AtStrategy, RtStrategy } from './strategies';
import { MailModule } from 'src/mail/mail.module';
import { BullModule } from '@nestjs/bull';
import { RecoveryProcessor } from './processors/recovery.processor';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import * as process from 'node:process';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    UsersModule,
    StorageModule,
    JwtModule.register({}),
    MailModule,
    BullModule.registerQueue(
      {
        name: 'recovery-queue',
        redis: process.env.REDIS_URL,
      },
      {
        name: 'confirmation-queue',
        redis: process.env.REDIS_URL,
      },
    ),
    PaymentModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AtStrategy,
    RtStrategy,
    AtGuard,
    RolesGuard,
    RecoveryProcessor,
  ],
  exports: [AtGuard, RolesGuard],
})
export class AuthModule {}
