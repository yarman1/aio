import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from '../../generated/prisma/client';

export class SearchPostsDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page = 1;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit = 10;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;
}
