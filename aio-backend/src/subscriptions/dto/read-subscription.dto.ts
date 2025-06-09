import { Expose } from 'class-transformer';

export class ReadSubscriptionDto {
  @Expose()
  planId: number;

  @Expose()
  createdAt: string;

  @Expose()
  currentPeriodEnd: string;

  @Expose()
  isCancelled: boolean;
}
