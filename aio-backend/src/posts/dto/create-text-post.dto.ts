import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { CreatePostDto } from './create-post.dto';

export class PostImageDto {
  @IsOptional()
  key?: string;

  @IsOptional()
  url?: string;

  @IsOptional()
  order?: number;
}

export class CreateTextPostDto extends CreatePostDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  categoryId: number;

  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostImageDto)
  @IsOptional()
  images?: PostImageDto[];
}
