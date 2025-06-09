import { Expose } from 'class-transformer';

export class ReadUserDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  userName: string;

  @Expose()
  createdAt: string;

  @Expose()
  isEmailConfirmed: string;

  @Expose()
  avatarUrl?: string;
}
