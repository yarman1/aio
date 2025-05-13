import { IsInt, IsString } from 'class-validator';

export class CreateExternalBenefitDto {
  @IsInt()
  planId: number;

  @IsString()
  name: string;
}
