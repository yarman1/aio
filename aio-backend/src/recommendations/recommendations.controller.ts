import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { User } from '../auth/decorators';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('/creator-category/:id')
  async getCategoryRecommendations(
    @Param('id', ParseIntPipe) categoryId: number,
    @Query('date') dateStr: string,
    @User(GetCreatorIdPipe) creatorId: number,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return {
      recommendation: await this.recommendationsService.recommendCategory(
        categoryId,
        date,
        creatorId,
      ),
    };
  }

  @Get('/creator-plan/:planId')
  async getPlanRecommendations(
    @Param('planId', ParseIntPipe) planId: number,
    @Query('date') dateStr: string,
    @User(GetCreatorIdPipe) creatorId: number,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return {
      recommendation: await this.recommendationsService.recommendPlan(
        planId,
        date,
        creatorId,
      ),
    };
  }
}
