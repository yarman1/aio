import { IsInt, IsPositive } from 'class-validator';

export class GetSubscriptionUpgradePreviewDTO {
  @IsInt()
  @IsPositive()
  creatorId: number;

  @IsInt()
  @IsPositive()
  newPlanId: number;
}
