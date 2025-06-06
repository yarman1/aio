import { PostType, PostStatus } from '../../generated/prisma/client';
import { CommentResponseDto } from './comment.dto';

export class PostImageResponseDto {
  id: number;

  key: string;

  order: number;

  url?: string;
}

export class PollOptionResponseDto {
  id: number;

  text: string;

  voteCount: number;
}

export class PollResponseDto {
  id: number;

  isClosed: boolean;

  options: PollOptionResponseDto[];
}

export class PostMediaResponseDto {
  id: number;

  mediaKey?: string;

  previewKey?: string;

  uploaded: boolean;

  mediaUrl?: string;

  previewUrl?: string;
}

export class CategoryResponseDto {
  id: number;

  name: string;

  isPublic: boolean;
}

// Main response DTO
export class PostResponseDto {
  id: number;

  type: PostType;

  name: string;

  description?: string;

  status: PostStatus;

  categoryId: number;

  category: CategoryResponseDto;

  commentsEnabled?: boolean;

  isReadyForActivation?: boolean;

  createdAt: Date;

  updatedAt: Date;

  likesCount: number;

  repostsCount: number;

  headerKey?: string;

  headerUrl?: string;

  images?: PostImageResponseDto[];

  media?: PostMediaResponseDto;

  poll?: PollResponseDto;

  comments?: CommentResponseDto[];

  isLiked?: boolean;

  hasAccess?: boolean;
}
