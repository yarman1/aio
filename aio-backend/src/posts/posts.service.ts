import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  UpdatePostDto,
  SearchPostsDto,
  LikePostDto,
  RepostPostDto,
  VotePollDto,
} from './dto';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { PostType, PostStatus, Prisma } from '../generated/prisma/client';
import { PostResponseDto, PostMediaResponseDto } from './dto/post.dto';
import sanitizeHtml from 'sanitize-html';
import { CreatePostDto } from './dto/create-post.dto';
import { SetPollOptionsDto } from './dto/set-poll-options.dto';

type RawPostWithSubs = Prisma.PostGetPayload<{
  include: {
    category: {
      include: {
        creator: {
          include: {
            subscriptions: {
              where: { userId: number; currentPeriodEnd: Date };
              select: {
                plan: {
                  select: {
                    creatorCategories: { select: { id: true } };
                  };
                };
              };
            };
          };
        };
      };
    };
    images: true;
    media: true;
    poll: { include: { options: true } };
  };
}>;

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async createPost(creatorId: number, dto: CreatePostDto) {
    const category = await this.prisma.creatorCategory.findFirst({
      where: { id: dto.categoryId, creatorId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Create post
    const post = await this.prisma.post.create({
      data: {
        type: PostType.TEXT,
        name: dto.name,
        categoryId: dto.categoryId,
        status: PostStatus.DRAFT,
        isReadyForActivation: false,
      },
    });

    return this.getPostByCreator(post.id, creatorId);
  }

  async updatePost(creatorId: number, postId: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: {
        category: true,
        media: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    // Sanitize description if provided
    let sanitizedDescription = dto.description;
    if (dto.description) {
      sanitizedDescription = this.sanitizeRichText(dto.description);
    }

    await this.prisma.$transaction(async (tx) => {
      // 1) delete comments if the flag has flipped off
      if (dto.commentsEnabled !== undefined && dto.commentsEnabled === false) {
        await tx.comment.deleteMany({ where: { postId } });

        await tx.post.update({
          where: { id: postId },
          data: {
            name: dto.name,
            description: sanitizedDescription,
            commentsEnabled: dto.commentsEnabled,
          },
        });
      } else {
        await tx.post.update({
          where: { id: postId },
          data: {
            name: dto.name,
            description: sanitizedDescription,
          },
        });
      }
    });
    await this.recalcReadyForActivation(postId);

    return this.getPostByCreator(creatorId, postId);
  }

  async setPollOptions(
    creatorId: number,
    postId: number,
    dto: SetPollOptionsDto,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: {
        category: true,
        media: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    if (post.type !== PostType.POLL) {
      throw new BadRequestException('Only poll posts can have options');
    }

    if (dto.options.length < 1) {
      throw new BadRequestException('Options must be greater than 1');
    }

    await this.prisma.pollOption.deleteMany({ where: { poll: { postId } } });
    await this.prisma.pollOption.createMany({
      data: dto.options.map((o, idx) => ({
        pollId: postId,
        text: o.text,
        voteCount: 0,
        order: idx,
      })),
    });
    await this.recalcReadyForActivation(postId);

    return this.getPostByCreator(creatorId, postId);
  }

  async closePoll(creatorId: number, postId: number): Promise<PostResponseDto> {
    // 1) Load post + poll + category
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true, poll: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // 2) Only the creator can close it
    if (post.category.creatorId !== creatorId) {
      throw new ForbiddenException('You can only close your own polls');
    }

    // 3) Must be a poll post
    if (post.type !== PostType.POLL || !post.poll) {
      throw new BadRequestException('Only poll posts can be closed');
    }

    // 4) Check not already closed
    if (post.poll.isClosed) {
      throw new ConflictException('This poll is already closed');
    }

    // 5) Close it
    await this.prisma.poll.update({
      where: { postId: postId },
      data: { isClosed: true },
    });

    // 6) Return the updated owner‐view of the post
    return this.getPostByCreator(creatorId, postId);
  }

  private sanitizeRichText(content: string): string {
    return sanitizeHtml(content, {
      // only these tags…
      allowedTags: [
        'b',
        'i',
        'u',
        'strong',
        'em',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'code',
        'pre',
        'a',
        'img',
        'div',
        'span',
      ],
      // and only these attributes on those tags
      allowedAttributes: {
        a: ['href', 'name', 'target'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['class', 'style'],
      },
      // enforce https/http/data on img/src and href
      allowedSchemes: ['http', 'https', 'mailto', 'data'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
      },
      // strip out any empty elements, comments, etc.
      selfClosing: ['br', 'hr', 'img'],
      // do not allow JavaScript URLs
      allowProtocolRelative: false,
    });
  }

  async activatePost(creatorId: number, postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only activate your own posts');
    }

    if (!post.isReadyForActivation) {
      throw new BadRequestException('Post is not ready for activation');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.ACTIVE },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async deactivatePost(creatorId: number, postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only deactivate your own posts');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.DRAFT },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async getPostById(id: number, userId?: number): Promise<PostResponseDto> {
    // 1) Fetch exactly one ACTIVE post, with the relations we need
    const post = await this.prisma.post.findUnique({
      where: { id, status: PostStatus.ACTIVE },
      include: {
        images: true,
        media: true,
        poll: { include: { options: true } },
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  // if userId is provided, filter real subs; otherwise filter on userId = 0 → empty array
                  where: userId
                    ? { userId, currentPeriodEnd: { gt: new Date() } }
                    : { userId: 0 },
                  select: {
                    plan: {
                      select: {
                        creatorCategories: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingView = await this.prisma.postView.findFirst({
      where: {
        postId: id,
        userId,
        viewDate: { gte: today },
      },
    });

    if (!existingView) {
      await this.prisma.postView.create({
        data: {
          postId: id,
          userId,
          viewDate: new Date(),
        },
      });
    }

    // 2) Determine whether the caller can see the FULL post
    const hasAccess =
      post.category.isPublic ||
      (!!userId &&
        post.category.creator.subscriptions.some((sub) =>
          sub.plan.creatorCategories.some((c) => c.id === post.categoryId),
        ));

    // 3) If no access → limited DTO
    if (!hasAccess) {
      return {
        id: post.id,
        type: post.type,
        name: post.name,
        description: post.description?.substring(0, 100) + '...',
        status: post.status,
        categoryId: post.categoryId,
        category: {
          id: post.category.id,
          name: post.category.name,
          isPublic: post.category.isPublic,
        },
        commentsEnabled: post.commentsEnabled,
        isReadyForActivation: post.isReadyForActivation,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likesCount: post.likesCount,
        repostsCount: post.repostsCount,
      };
    }

    let headerUrl: string | undefined;
    if (post.headerKey) {
      headerUrl = await this.storageService.getPresignedUrl(post.headerKey);
    }

    const images = await Promise.all(
      post.images.map(async (img) => ({
        id: img.id,
        key: img.key,
        order: img.order,
        url: await this.storageService.getPresignedUrl(img.key),
      })),
    );

    let mediaUrl: string | undefined;
    let previewUrl: string | undefined;
    if (post.media?.mediaKey) {
      mediaUrl = await this.storageService.getPresignedUrl(post.media.mediaKey);
    }
    if (post.media?.previewKey) {
      previewUrl = await this.storageService.getPresignedUrl(
        post.media.previewKey,
      );
    }

    // 4) Return full DTO with URLs
    return {
      id: post.id,
      type: post.type,
      name: post.name,
      description: post.description,
      status: post.status,
      categoryId: post.categoryId,
      category: {
        id: post.category.id,
        name: post.category.name,
        isPublic: post.category.isPublic,
      },
      commentsEnabled: post.commentsEnabled,
      isReadyForActivation: post.isReadyForActivation,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likesCount: post.likesCount,
      repostsCount: post.repostsCount,

      headerKey: post.headerKey,
      headerUrl,

      images,

      media: post.media
        ? {
            id: post.media.id,
            mediaKey: post.media.mediaKey,
            previewKey: post.media.previewKey,
            uploaded: post.media.uploaded,
            mediaUrl,
            previewUrl,
          }
        : undefined,

      poll: post.poll
        ? {
            id: post.poll.id,
            isClosed: post.poll.isClosed,
            options: post.poll.options.map((o) => ({
              id: o.id,
              text: o.text,
              voteCount: o.voteCount,
            })),
          }
        : undefined,

      comments: post.commentsEnabled ? await this.loadComments(post.id) : [],
    };
  }

  /** Helper to fetch nested comments */
  private async loadComments(postId: number) {
    return this.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: { select: { id: true, userName: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, userName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadPostHeaderImage(
    creatorId: number,
    postId: number,
    file: Express.Multer.File,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    // Delete old header if exists
    if (post.headerKey) {
      await this.storageService.deleteFile(post.headerKey);
    }

    // Upload new header
    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/header.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

    // Update post
    await this.prisma.post.update({
      where: { id: postId },
      data: { headerKey: key },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async uploadPostImage(
    creatorId: number,
    postId: number,
    file: Express.Multer.File,
    order: number,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    if (post.type !== PostType.TEXT) {
      throw new BadRequestException('Only text posts can have images');
    }

    // Check if we already have 5 images
    const imageCount = await this.prisma.postImage.count({
      where: { postId },
    });

    if (imageCount >= 5) {
      throw new BadRequestException('Maximum 5 images allowed per post');
    }

    // Upload image
    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/images/${order}.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

    // Create image record
    await this.prisma.postImage.create({
      data: {
        postId,
        key,
        order,
      },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async initiateMediaUpload(
    creatorId: number,
    postId: number,
    contentType: string,
    fileSize: number,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    if (post.type !== PostType.VIDEO && post.type !== PostType.AUDIO) {
      throw new BadRequestException(
        'Only video and audio posts can have media',
      );
    }

    const extension = contentType.split('/')[1];
    const key = `posts/${postId}/media.${extension}`;

    return this.storageService.initiateMultipartUpload(
      key,
      contentType,
      fileSize,
      true,
    );
  }

  async completeMediaUpload(
    creatorId: number,
    postId: number,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true, media: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    if (post.type !== PostType.VIDEO && post.type !== PostType.AUDIO) {
      throw new BadRequestException(
        'Only video and audio posts can have media',
      );
    }

    const extension = post.media?.mediaKey?.split('.').pop() || 'mp4';
    const key = `posts/${postId}/media.${extension}`;

    const { key: mediaKey } = await this.storageService.completeMultipartUpload(
      uploadId,
      key,
      parts,
      true,
    );

    // Update media record
    await this.prisma.postMedia.update({
      where: { postId },
      data: {
        mediaKey,
        uploaded:
          post.type === PostType.VIDEO ? !!post.media?.previewKey : true,
      },
    });

    // Update post readiness for activation
    await this.recalcReadyForActivation(postId);

    return this.getPostByCreator(creatorId, postId);
  }

  async uploadMediaPreview(
    creatorId: number,
    postId: number,
    file: Express.Multer.File,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true, media: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    if (post.type !== PostType.VIDEO) {
      throw new BadRequestException('Only video posts can have preview images');
    }

    // Delete old preview if exists
    if (post.media?.previewKey) {
      await this.storageService.deleteFile(post.media.previewKey);
    }

    // Upload new preview
    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/preview.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

    // Update media record
    await this.prisma.postMedia.update({
      where: { postId },
      data: {
        previewKey: key,
        uploaded: !!post.media?.mediaKey,
      },
    });

    // Update post readiness for activation
    await this.recalcReadyForActivation(postId);

    return this.getPostByCreator(creatorId, postId);
  }

  async refreshMediaUrls(
    postId: number,
    userId: number,
  ): Promise<PostMediaResponseDto | null> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: true,
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  where: {
                    userId,
                    currentPeriodEnd: { gt: new Date() },
                  },
                  include: {
                    plan: {
                      include: {
                        creatorCategories: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post?.media) {
      return null;
    }

    // Check if user has an active subscription to a plan that includes this category
    const hasSubscription = post.category.creator.subscriptions.some(
      (subscription) =>
        !subscription.isEnded &&
        subscription.plan.creatorCategories.some(
          (category) => category.id === post.categoryId,
        ),
    );

    if (!hasSubscription) {
      throw new ForbiddenException('You do not have access to this media');
    }

    const mediaWithUrls: PostMediaResponseDto = {
      ...post.media,
      mediaUrl: post.media.mediaKey
        ? await this.storageService.getPresignedUrl(post.media.mediaKey)
        : undefined,
      previewUrl: post.media.previewKey
        ? await this.storageService.getPresignedUrl(post.media.previewKey)
        : undefined,
    };

    return mediaWithUrls;
  }

  async searchPosts(
    userId: number | undefined,
    dto: SearchPostsDto,
  ): Promise<{ posts: PostResponseDto[]; total: number }> {
    const { page, limit, categoryId, name, type } = dto;
    const skip = (page - 1) * limit;

    // 1) Build WHERE clause
    const where: Prisma.PostWhereInput = {
      status: PostStatus.ACTIVE,
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
    };

    // 2) Count total matches
    const total = await this.prisma.post.count({ where });

    // 3) Fetch raw posts + whether this user has a valid sub for each
    const raws = await this.prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  where: {
                    userId: userId ?? 0,
                    currentPeriodEnd: { gt: new Date() },
                  },
                  select: {
                    plan: {
                      select: {
                        creatorCategories: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        images: true,
        media: true,
        poll: { include: { options: true } },
      },
    });

    // 4) Map → full vs limited DTO
    const posts = await Promise.all(
      raws.map(async (post) => {
        const hasSubscription = post.category.creator.subscriptions.some(
          (sub) =>
            sub.plan.creatorCategories.some((c) => c.id === post.categoryId),
        );
        const hasAccess =
          post.category.isPublic || (!!userId && hasSubscription);

        if (userId && hasAccess) {
          // full DTO for authenticated user with access
          return this.buildFullDto(post);
        }

        // limited DTO for public or unauthorized user
        return this.buildLimitedDto(post);
      }),
    );

    return { posts, total };
  }

  private buildLimitedDto(post: RawPostWithSubs): PostResponseDto {
    return {
      id: post.id,
      type: post.type,
      name: post.name,
      description: post.description
        ? post.description.substring(0, 100).trim() + '...'
        : undefined,
      status: post.status,
      categoryId: post.categoryId,
      category: {
        id: post.category.id,
        name: post.category.name,
        isPublic: post.category.isPublic,
      },
      commentsEnabled: post.commentsEnabled,
      isReadyForActivation: post.isReadyForActivation,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likesCount: post.likesCount,
      repostsCount: post.repostsCount,
      // no media URLs, no poll, no images, etc.
    };
  }

  private async buildFullDto(post: RawPostWithSubs): Promise<PostResponseDto> {
    // header
    const headerUrl = post.headerKey
      ? await this.storageService.getPresignedUrl(post.headerKey)
      : undefined;

    // images
    const images = await Promise.all(
      post.images.map(async (img) => ({
        id: img.id,
        key: img.key,
        order: img.order,
        url: await this.storageService.getPresignedUrl(img.key),
      })),
    );

    // media
    let mediaUrl: string | undefined;
    let previewUrl: string | undefined;
    if (post.media?.mediaKey) {
      mediaUrl = await this.storageService.getPresignedUrl(post.media.mediaKey);
    }
    if (post.media?.previewKey) {
      previewUrl = await this.storageService.getPresignedUrl(
        post.media.previewKey,
      );
    }

    // poll
    const poll = post.poll
      ? {
          id: post.poll.id,
          isClosed: post.poll.isClosed,
          options: post.poll.options.map((o) => ({
            id: o.id,
            text: o.text,
            voteCount: o.voteCount,
          })),
        }
      : undefined;

    // comments (only if enabled)
    const comments = post.commentsEnabled
      ? await this.loadComments(post.id)
      : [];

    return {
      id: post.id,
      type: post.type,
      name: post.name,
      description: post.description,
      status: post.status,
      categoryId: post.categoryId,
      category: {
        id: post.category.id,
        name: post.category.name,
        isPublic: post.category.isPublic,
      },
      commentsEnabled: post.commentsEnabled,
      isReadyForActivation: post.isReadyForActivation,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likesCount: post.likesCount,
      repostsCount: post.repostsCount,

      headerKey: post.headerKey,
      headerUrl,

      images,

      media: post.media
        ? {
            id: post.media.id,
            mediaKey: post.media.mediaKey!,
            previewKey: post.media.previewKey!,
            uploaded: post.media.uploaded,
            mediaUrl,
            previewUrl,
          }
        : undefined,

      poll,

      comments,
    };
  }

  private async checkUserHasAccessToPost(
    userId: number,
    postId: number,
  ): Promise<boolean> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  where: {
                    userId,
                    currentPeriodEnd: { gt: new Date() },
                  },
                  include: {
                    plan: {
                      include: {
                        creatorCategories: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if category is public
    if (post.category.isPublic) {
      return true;
    }

    // Check if user has an active subscription to a plan that includes this category
    return post.category.creator.subscriptions.some(
      (subscription) =>
        !subscription.isEnded &&
        subscription.plan.creatorCategories.some(
          (category) => category.id === post.categoryId,
        ),
    );
  }

  async likePost(userId: number, dto: LikePostDto) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, dto.postId);
    if (!hasAccess) throw new ForbiddenException();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.postLike.create({
          data: { postId: dto.postId, userId },
        });
        await tx.post.update({
          where: { id: dto.postId },
          data: { likesCount: { increment: 1 } },
        });
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('You have already liked this post');
      }
      throw error;
    }
  }

  async unlikePost(userId: number, postId: number) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, postId);
    if (!hasAccess) throw new ForbiddenException();

    await this.prisma.$transaction(async (tx) => {
      const like = await tx.postLike.findUnique({
        where: { unique_like_per_user: { postId, userId } },
      });
      if (!like) throw new NotFoundException('Like not found');

      await tx.postLike.delete({
        where: { unique_like_per_user: { postId, userId } },
      });
      await tx.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
    });
  }

  async repostPost(userId: number, dto: RepostPostDto) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, dto.postId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this post');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.postRepost.create({
        data: { postId: dto.postId, userId },
      });
      await tx.post.update({
        where: { id: dto.postId },
        data: { repostsCount: { increment: 1 } },
      });
    });
  }

  async votePoll(userId: number, dto: VotePollDto) {
    // 1) Access check
    const hasAccess = await this.checkUserHasAccessToPost(userId, dto.pollId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this poll');
    }

    // 2) Verify poll exists & is open
    const poll = await this.prisma.poll.findUnique({
      where: { id: dto.pollId },
      include: { options: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.isClosed) {
      throw new BadRequestException('This poll is closed');
    }

    // 3) Check for existing vote
    const existingVote = await this.prisma.pollVote.findUnique({
      where: {
        unique_vote_per_poll: { pollId: dto.pollId, userId },
      },
    });
    if (existingVote) {
      throw new ConflictException('You have already voted in this poll');
    }

    // 4) Verify that the option belongs to this poll
    if (!poll.options.some((opt) => opt.id === dto.optionId)) {
      throw new NotFoundException('Poll option not found');
    }

    // 5) Atomic create+increment
    await this.prisma.$transaction(async (tx) => {
      await tx.pollVote.create({
        data: {
          pollId: dto.pollId,
          optionId: dto.optionId,
          userId,
        },
      });
      await tx.pollOption.update({
        where: { id: dto.optionId },
        data: {
          voteCount: { increment: 1 },
        },
      });
    });

    // 6) (Optional) return updated poll or vote record
    return { success: true };
  }

  async createComment(userId: number, createCommentDto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: createCommentDto.postId },
      include: {
        category: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.commentsEnabled) {
      throw new BadRequestException('Comments are disabled for this post');
    }

    // Check if user has access to the post
    const hasAccess = await this.checkUserHasAccessToPost(userId, post.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this post');
    }

    // If this is a reply, verify the parent comment exists and belongs to the same post
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment || parentComment.postId !== post.id) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        postId: createCommentDto.postId,
        userId,
        parentId: createCommentDto.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.prisma.commentEvent.create({
      data: {
        commentId: comment.id,
        type: 'CREATED',
        createdAt: new Date(),
      },
    });

    return comment;
  }

  async updateComment(
    userId: number,
    commentId: number,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    await this.prisma.commentEvent.create({
      data: {
        commentId,
        type: 'UPDATED',
        createdAt: new Date(),
      },
    });

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: updateCommentDto.content },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteComment(userId: number, commentId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.commentEvent.create({
      data: {
        commentId,
        type: 'DELETED',
        createdAt: new Date(),
      },
    });

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  async getPostComments(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        category: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user has access to the post
    const hasAccess = await this.checkUserHasAccessToPost(userId, post.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this post');
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Only get top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return comments;
  }

  async searchCreatorPosts(
    creatorId: number,
    dto: SearchPostsDto,
  ): Promise<{ posts: PostResponseDto[]; total: number }> {
    const { page, limit, categoryId, name, type } = dto;
    const skip = (page - 1) * limit;

    // 1) Build WHERE clause
    const where: Prisma.PostWhereInput = {
      status: PostStatus.ACTIVE,
      category: { creatorId },
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
    };

    // 2) Total count
    const total = await this.prisma.post.count({ where });

    // 3) Fetch the raws (no subscriptions needed)
    const raws = await this.prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: true,
        media: true,
        poll: { include: { options: true } },
      },
    });

    // 4) Map → full DTO for each
    const posts = await Promise.all(
      raws.map((raw) => this.buildFullDto(raw as any)),
    );

    return { posts, total };
  }

  async getPostByCreator(
    creatorId: number,
    postId: number,
  ): Promise<PostResponseDto> {
    // 1) Fetch raw post, ensuring the category belongs to this creator
    const raw = await this.prisma.post.findFirst({
      where: {
        id: postId,
        category: { creatorId },
      },
      include: {
        images: true,
        media: true,
        poll: { include: { options: true } },
        category: true,
        comments: {
          include: {
            user: { select: { id: true, userName: true, avatarUrl: true } },
            replies: {
              include: {
                user: { select: { id: true, userName: true, avatarUrl: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!raw) {
      throw new NotFoundException('Post not found');
    }

    // 2) Build presigned URLs
    const headerUrl = raw.headerKey
      ? await this.storageService.getPresignedUrl(raw.headerKey)
      : undefined;

    const images = await Promise.all(
      raw.images.map(async (img) => ({
        id: img.id,
        key: img.key,
        order: img.order,
        url: await this.storageService.getPresignedUrl(img.key),
      })),
    );

    const mediaUrl = raw.media?.mediaKey
      ? await this.storageService.getPresignedUrl(raw.media.mediaKey)
      : undefined;

    const previewUrl = raw.media?.previewKey
      ? await this.storageService.getPresignedUrl(raw.media.previewKey)
      : undefined;

    // 3) Map to an “owner” DTO
    return {
      id: raw.id,
      type: raw.type,
      name: raw.name,
      description: raw.description,
      status: raw.status,
      categoryId: raw.categoryId,
      category: {
        id: raw.category.id,
        name: raw.category.name,
        isPublic: raw.category.isPublic,
      },
      commentsEnabled: raw.commentsEnabled,
      isReadyForActivation: raw.isReadyForActivation,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      likesCount: raw.likesCount,
      repostsCount: raw.repostsCount,

      headerKey: raw.headerKey,
      headerUrl,

      images,

      media: raw.media
        ? {
            id: raw.media.id,
            mediaKey: raw.media.mediaKey,
            previewKey: raw.media.previewKey,
            uploaded: raw.media.uploaded,
            mediaUrl,
            previewUrl,
          }
        : undefined,

      poll: raw.poll
        ? {
            id: raw.poll.id,
            isClosed: raw.poll.isClosed,
            options: raw.poll.options.map((o) => ({
              id: o.id,
              text: o.text,
              voteCount: o.voteCount,
            })),
          }
        : undefined,

      comments: raw.comments,
    };
  }

  async recordMediaPlay(userId: number, postId: number, duration?: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.type !== PostType.VIDEO && post.type !== PostType.AUDIO) {
      throw new BadRequestException(
        'Only video and audio posts can have media',
      );
    }

    return this.prisma.mediaPlay.create({
      data: {
        postId,
        userId,
        duration,
      },
    });
  }

  private async recalcReadyForActivation(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: true,
        images: true,
        poll: {
          include: {
            options: true,
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    let ready = false;
    switch (post.type) {
      case PostType.TEXT:
        ready = !!post.name && !!post.description;
        break;
      case PostType.POLL:
        // for polls we require at least one header or maybe options already exist
        ready = !!post.name && post.poll?.options?.length > 1;
        break;
      case PostType.AUDIO:
        ready = !!post.name && post.media?.uploaded === true;
        break;
      case PostType.VIDEO:
        ready =
          post.media?.uploaded === true &&
          typeof !!post.name &&
          post.media.previewKey === 'string';
        break;
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { isReadyForActivation: ready },
    });
  }
}
