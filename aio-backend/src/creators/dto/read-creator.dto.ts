import { Expose } from 'class-transformer';

export class ReadCreatorDto {
  @Expose()
  creatorUsername: string;

  @Expose()
  description: string;

  @Expose()
  isStripeAccountVerified: boolean;
}
