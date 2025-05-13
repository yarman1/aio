import { IsInt, IsPositive } from 'class-validator';

export class GetSubscriptionUpgradePreviewDTO {
  @IsInt()
  @IsPositive()
  subscriptionId: number;

  @IsInt()
  @IsPositive()
  newPlanId: number;
}
