import { IsNotEmpty, IsString } from 'class-validator';

export class CreatorUsernameDto {
  @IsString()
  @IsNotEmpty()
  creatorUsername: string;
}
