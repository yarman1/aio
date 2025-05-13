import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [StatsService],
})
export class StatsModule {}
