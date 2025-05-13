import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PollOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreatePollPostDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];
}
