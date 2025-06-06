import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCreatorDto {
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsString()
  @IsNotEmpty()
  creatorUsername?: string;
}
