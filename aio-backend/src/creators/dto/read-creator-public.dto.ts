import { Expose } from 'class-transformer';

export class ReadCreatorPublicDto {
  @Expose()
  id: number;

  @Expose()
  creatorUsername: string;

  @Expose()
  description: string;

  @Expose()
  isStripeAccountVerified: boolean;

  @Expose()
  avatarUrl: string;

  @Expose()
  isFollowed: boolean;

  @Expose()
  isSubscribed: boolean;
}
