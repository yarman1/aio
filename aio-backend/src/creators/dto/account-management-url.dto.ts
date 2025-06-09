import { Expose } from 'class-transformer';

export class AccountManagementUrlDto {
  @Expose()
  url: string;
}
