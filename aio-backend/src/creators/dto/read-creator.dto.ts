import { Expose } from 'class-transformer';

export class ReadCreatorDto {
  @Expose()
  id: number;

  @Expose()
  creatorUsername: string;

  @Expose()
  description: string;

  @Expose()
  avatarUrl: string;

  @Expose()
  isStripeAccountVerified: boolean;
}
