import { IsInt } from 'class-validator';

export class LikePostDto {
  @IsInt()
  postId: number;
}
