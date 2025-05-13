import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsInt()
  postId: number;

  @IsOptional()
  @IsInt()
  parentId?: number;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

export class CommentResponseDto {
  id: number;
  content: string;
  postId: number;
  userId: number;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    userName: string;
    avatarUrl?: string;
  };
  replies?: CommentResponseDto[];
}
