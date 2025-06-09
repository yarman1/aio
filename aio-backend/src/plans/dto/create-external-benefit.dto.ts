import { IsString } from 'class-validator';

export class CreateExternalBenefitDto {
  @IsString()
  name: string;
}
