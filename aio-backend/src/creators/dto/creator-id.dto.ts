import { IsInt } from 'class-validator';

export class CreatorIdDto {
  @IsInt()
  creatorId: number;
}
