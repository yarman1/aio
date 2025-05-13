import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PollOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SetPollOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];
}
