import { IsString, IsNotEmpty, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '../../generated/prisma/client';

export class CreateMediaPostDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @IsEnum(PostType)
  type: PostType;
}
