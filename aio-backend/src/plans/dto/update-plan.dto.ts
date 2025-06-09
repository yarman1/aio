import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';
import { IsInt, IsPositive } from 'class-validator';

export class UpdatePlanDto extends PartialType(
  OmitType(CreatePlanDto, ['intervalType', 'intervalCount', 'price']),
) {
  @IsInt()
  @IsPositive()
  planId: number;
}
