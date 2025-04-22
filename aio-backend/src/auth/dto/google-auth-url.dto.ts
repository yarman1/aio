import { Expose } from 'class-transformer';

export class GoogleAuthUrlDto {
  @Expose()
  authUrl: string;
}
