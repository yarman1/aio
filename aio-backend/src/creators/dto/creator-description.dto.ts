import { IsNotEmpty, IsString } from 'class-validator';

export class CreatorDescriptionDto {
  @IsString()
  @IsNotEmpty()
  description: string;
}
