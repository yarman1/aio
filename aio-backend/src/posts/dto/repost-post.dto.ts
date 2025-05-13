import { IsInt } from 'class-validator';

export class RepostPostDto {
  @IsInt()
  postId: number;
}
