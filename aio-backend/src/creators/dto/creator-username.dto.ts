import { IsString } from 'class-validator';

export class CreatorUsernameDto {
  @IsString()
  userName: string;
}
