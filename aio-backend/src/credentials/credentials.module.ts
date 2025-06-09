import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialsGuard } from './credentials.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CredentialsController],
  providers: [CredentialsService, CredentialsGuard],
  exports: [CredentialsService, CredentialsGuard],
})
export class CredentialsModule {}
