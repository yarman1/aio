import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Public } from 'src/auth/decorators';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Post('aggregate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerAggregateDaily(): Promise<void> {
    await this.statsService.aggregateDaily();
  }
}
