import { Expose } from 'class-transformer';

export class ReadUserDto {
  @Expose()
  email: string;

  @Expose()
  userName: string;

  @Expose()
  createdAt: string;
}
