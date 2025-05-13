import { IsInt, IsOptional, Min } from 'class-validator';

export class PlayMediaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}
