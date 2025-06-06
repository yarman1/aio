import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
