import { IsInt } from 'class-validator';

export class VotePollDto {
  @IsInt()
  pollId: number;

  @IsInt()
  optionId: number;
}
