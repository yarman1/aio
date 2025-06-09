import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { Roles, User } from '../auth/decorators';
import { JwtRtPayload, Role } from '../auth/types';
import { ApiTags } from '@nestjs/swagger';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateCreatorCategoryDto } from './dto/create-creator-category.dto';
import { ReadCreatorCategoryDto } from './dto/read-creator-category.dto';
import { CreateExternalBenefitDto } from './dto/create-external-benefit.dto';
import { ReadExternalBenefitDto } from './dto/read-external-benefit.dto';
import { ReadPlanDto } from './dto/read-plan.dto';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { plainToInstance } from 'class-transformer';

@Roles(Role.User)
@ApiTags('plans')
@Controller('plan')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  async create(
    @Body() dto: CreatePlanDto,
    @User(GetCreatorIdPipe) creatorId: number,
  ) {
    const plan = await this.plansService.createPlan(dto, creatorId);
    return plainToInstance(ReadPlanDto, plan);
  }

  @Get('/creator-category')
  async getAllCreatorCategories(@User(GetCreatorIdPipe) creatorId: number) {
    const cats = await this.plansService.getAllCreatorCategories(creatorId);
    return plainToInstance(ReadCreatorCategoryDto, cats);
  }

  @Get('/creator-category/:creatorId')
  async getCreatorCategoriesPublic(
    @Param('creatorId', ParseIntPipe) creatorId: number,
  ) {
    const cats = await this.plansService.getCreatorCategoriesPublic(creatorId);
    return plainToInstance(ReadCreatorCategoryDto, cats);
  }

  @Get('/external-benefit')
  async getAllExternalBenefits(@User(GetCreatorIdPipe) creatorId: number) {
    const bens = await this.plansService.getAllExternalBenefits(creatorId);
    return plainToInstance(ReadExternalBenefitDto, bens);
  }

  @Post('/creator-category')
  async createCreatorCategory(
    @User(GetCreatorIdPipe) creatorId: number,
    @Body() dto: CreateCreatorCategoryDto,
  ) {
    const cat = await this.plansService.createCreatorCategory(creatorId, dto);
    return plainToInstance(ReadCreatorCategoryDto, cat);
  }

  @Delete('/creator-category/:categoryId')
  async deleteCreatorCategory(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    await this.plansService.deleteCreatorCategory(creatorId, categoryId);
  }

  @Post('/external-benefit')
  async createExternalBenefit(
    @User(GetCreatorIdPipe) creatorId: number,
    @Body() dto: CreateExternalBenefitDto,
  ) {
    const ben = await this.plansService.createExternalBenefit(creatorId, dto);
    return plainToInstance(ReadExternalBenefitDto, ben);
  }

  @Delete('/external-benefit/:benefitId')
  async deleteExternalBenefit(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('benefitId', ParseIntPipe) benefitId: number,
  ) {
    await this.plansService.deleteExternalBenefit(creatorId, benefitId);
  }

  @Patch()
  async updatePlan(
    @User(GetCreatorIdPipe) creatorId: number,
    @Body() dto: UpdatePlanDto,
  ) {
    const plan = await this.plansService.updatePlan(creatorId, dto);
    return plainToInstance(ReadPlanDto, plan);
  }

  @Get('/:planId')
  async getPlanById(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    const plan = await this.plansService.getPlanById(planId, creatorId);
    return plainToInstance(ReadPlanDto, plan);
  }

  @Get()
  async getPlans(@User(GetCreatorIdPipe) creatorId: number) {
    const plans = await this.plansService.getPlans(creatorId);
    return plainToInstance(ReadPlanDto, plans);
  }

  @Get('/:creatorId/public')
  async getPlansPublic(@Param('creatorId', ParseIntPipe) creatorId: number) {
    const plans = await this.plansService.getPlansPublic(creatorId);
    return plainToInstance(ReadPlanDto, plans);
  }

  @Get('/archived/:planId')
  async getMyArchivedPlan(
    @User() user: JwtRtPayload,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    const res = await this.plansService.getMyArchivedPlan(user.sub, planId);
    return plainToInstance(ReadPlanDto, res);
  }

  @Post('/change-status/:planId')
  async changePlanStatus(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    const res = await this.plansService.changePlanStatus(creatorId, planId);
    return plainToInstance(ReadPlanDto, res);
  }
}
