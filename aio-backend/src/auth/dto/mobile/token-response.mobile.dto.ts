import { Expose } from 'class-transformer';

export class TokenResponseMobileDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  deviceId: string;
}
