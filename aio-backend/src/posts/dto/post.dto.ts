import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostType, PostStatus } from '../../generated/prisma/client';
import { CommentResponseDto } from './comment.dto';

// Base DTOs for common fields
export class BasePostDto {
  @ApiProperty({ description: 'Post name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Post description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsNumber()
  categoryId: number;
}

// Response DTOs for nested structures
export class PostImageResponseDto {
  @ApiProperty({ description: 'Image ID' })
  id: number;

  @ApiProperty({ description: 'Storage key for the image' })
  key: string;

  @ApiProperty({ description: 'Display order of the image' })
  order: number;

  @ApiProperty({ description: 'Presigned URL for the image', required: false })
  url?: string;
}

export class PollOptionResponseDto {
  @ApiProperty({ description: 'Option ID' })
  id: number;

  @ApiProperty({ description: 'Option text' })
  text: string;

  @ApiProperty({ description: 'Number of votes for this option' })
  voteCount: number;
}

export class PollResponseDto {
  @ApiProperty({ description: 'Poll ID' })
  id: number;

  @ApiProperty({ description: 'Whether the poll is closed' })
  isClosed: boolean;

  @ApiProperty({ type: [PollOptionResponseDto], description: 'Poll options' })
  options: PollOptionResponseDto[];
}

export class PostMediaResponseDto {
  @ApiProperty({ description: 'Media ID' })
  id: number;

  @ApiProperty({
    description: 'Storage key for the media file',
    required: false,
  })
  mediaKey?: string;

  @ApiProperty({
    description: 'Storage key for the preview image',
    required: false,
  })
  previewKey?: string;

  @ApiProperty({ description: 'Whether the media has been uploaded' })
  uploaded: boolean;

  @ApiProperty({
    description: 'Presigned URL for the media file',
    required: false,
  })
  mediaUrl?: string;

  @ApiProperty({
    description: 'Presigned URL for the preview image',
    required: false,
  })
  previewUrl?: string;
}

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id: number;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Whether the category is public' })
  isPublic: boolean;
}

// Main response DTO
export class PostResponseDto {
  @ApiProperty({ description: 'Post ID' })
  id: number;

  @ApiProperty({ enum: PostType, description: 'Type of post' })
  type: PostType;

  @ApiProperty({ description: 'Post name' })
  name: string;

  @ApiProperty({ description: 'Post description', required: false })
  description?: string;

  @ApiProperty({ enum: PostStatus, description: 'Post status' })
  status: PostStatus;

  @ApiProperty({ description: 'Category ID' })
  categoryId: number;

  @ApiProperty({
    type: CategoryResponseDto,
    description: 'Category information',
  })
  category: CategoryResponseDto;

  @ApiProperty({ description: 'Whether comments are enabled' })
  commentsEnabled: boolean;

  @ApiProperty({ description: 'Whether the post is ready for activation' })
  isReadyForActivation: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Number of likes' })
  likesCount: number;

  @ApiProperty({ description: 'Number of reposts' })
  repostsCount: number;

  @ApiProperty({
    description: 'Storage key for the header image',
    required: false,
  })
  headerKey?: string;

  @ApiProperty({
    description: 'Presigned URL for the header image',
    required: false,
  })
  headerUrl?: string;

  @ApiProperty({
    type: [PostImageResponseDto],
    description: 'Post images',
    required: false,
  })
  images?: PostImageResponseDto[];

  @ApiProperty({
    type: PostMediaResponseDto,
    description: 'Post media',
    required: false,
  })
  media?: PostMediaResponseDto;

  @ApiProperty({
    type: PollResponseDto,
    description: 'Post poll',
    required: false,
  })
  poll?: PollResponseDto;

  @ApiProperty({
    type: [CommentResponseDto],
    description: 'Post comments',
    required: false,
  })
  comments?: CommentResponseDto[];
}

// Create DTOs
export class CreateTextPostDto extends BasePostDto {
  @ApiProperty({ type: [String], description: 'Image keys', required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  images?: string[];
}

export class CreateMediaPostDto extends BasePostDto {
  @ApiProperty({ enum: PostType, description: 'Type of media post' })
  @IsEnum(PostType)
  type: PostType;
}

export class CreatePollPostDto extends BasePostDto {
  @ApiProperty({ type: [String], description: 'Poll options' })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  options: string[];
}

// Update DTO
export class UpdatePostDto {
  @ApiProperty({ description: 'Post name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Post description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ description: 'Whether comments are enabled', required: false })
  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;
}

// Search DTO
export class SearchPostsDto {
  @ApiProperty({ description: 'Category ID to filter by', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 10;
}

// Interaction DTOs
export class LikePostDto {
  @ApiProperty({ description: 'Post ID to like' })
  @IsNumber()
  postId: number;
}

export class RepostPostDto {
  @ApiProperty({ description: 'Post ID to repost' })
  @IsNumber()
  postId: number;
}

export class VotePollDto {
  @ApiProperty({ description: 'Poll ID' })
  @IsNumber()
  pollId: number;

  @ApiProperty({ description: 'Option ID to vote for' })
  @IsNumber()
  optionId: number;
}
