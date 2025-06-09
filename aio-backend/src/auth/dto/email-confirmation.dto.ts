import { IsInt, IsNumber } from 'class-validator';

export class EmailConfirmationDto {
  @IsNumber()
  @IsInt()
  userId: number;
}
