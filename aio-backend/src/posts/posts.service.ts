import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateCommentDto,
  SearchPostsDto,
  UpdateCommentDto,
  UpdatePostDto,
  VotePollDto,
} from './dto';
import { PostStatus, PostType, Prisma } from '../generated/prisma/client';
import { PostMediaResponseDto, PostResponseDto } from './dto/post.dto';
import sanitizeHtml from 'sanitize-html';
import { CreatePostDto } from './dto/create-post.dto';
import { SetPollOptionsDto } from './dto/set-poll-options.dto';
import { SearchPostsUsersDto } from './dto/search-posts-users.dto';

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

    const post = await this.prisma.post.create({
      data: {
        type: dto.type,
        name: dto.name,
        categoryId: dto.categoryId,
        status: PostStatus.DRAFT,
        isReadyForActivation: false,
      },
    });

    return this.getPostByCreator(creatorId, post.id);
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

    let sanitizedDescription = dto.description;
    if (dto.description) {
      sanitizedDescription = this.sanitizeRichText(dto.description);
    }

    await this.prisma.$transaction(async (tx) => {
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

    let pollOptionsObj = await this.prisma.poll.findUnique({
      where: { postId },
    });

    if (!pollOptionsObj) {
      pollOptionsObj = await this.prisma.poll.create({
        data: {
          postId,
        },
      });
    }

    if (pollOptionsObj.isClosed) {
      throw new BadRequestException('Poll is already closed');
    }

    await this.prisma.pollOption.deleteMany({
      where: { poll: { id: pollOptionsObj.id } },
    });
    await this.prisma.pollOption.createMany({
      data: dto.options.map((o) => ({
        pollId: pollOptionsObj.id,
        text: o.text,
        voteCount: 0,
      })),
    });
    await this.recalcReadyForActivation(postId);

    return this.getPostByCreator(creatorId, postId);
  }

  async closePoll(creatorId: number, postId: number): Promise<PostResponseDto> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true, poll: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new ForbiddenException('You can only close your own polls');
    }

    if (post.type !== PostType.POLL || !post.poll) {
      throw new BadRequestException('Only poll posts can be closed');
    }

    if (post.poll.isClosed) {
      throw new ConflictException('This poll is already closed');
    }

    await this.prisma.poll.update({
      where: { postId: postId },
      data: { isClosed: true },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  private sanitizeRichText(content: string): string {
    return sanitizeHtml(content, {
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
      allowedAttributes: {
        a: ['href', 'name', 'target'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['class', 'style'],
      },
      allowedSchemes: ['http', 'https', 'mailto', 'data'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
      },
      selfClosing: ['br', 'hr', 'img'],
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
                  where: userId
                    ? { userId, isEnded: { equals: false } }
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
      throw new NotFoundException(`Post is not found`);
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

    const hasAccess =
      post.category.isPublic ||
      (!!userId &&
        post.category.creator.subscriptions.some((sub) =>
          sub.plan.creatorCategories.some((c) => c.id === post.categoryId),
        ));

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
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likesCount: post.likesCount,
        repostsCount: post.repostsCount,
        hasAccess: false,
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

    let likedByCurrentUser = false;
    if (userId) {
      const existingLike = await this.prisma.postLike.findUnique({
        where: {
          unique_like_per_user: {
            postId: id,
            userId,
          },
        },
      });
      likedByCurrentUser = !!existingLike;
    }

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
      isLiked: likedByCurrentUser,
      hasAccess: true,

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

    if (post.headerKey) {
      await this.storageService.deleteFile(post.headerKey);
    }

    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/header.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

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

    if (order < 1 || order > 5) {
      throw new BadRequestException('Order must be between 1 and 5');
    }

    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/images/${order}.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

    await this.prisma.postImage.upsert({
      where: {
        postId_order: { postId, order },
      },
      update: {
        key,
      },
      create: {
        postId,
        key,
        order,
      },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async deletePostImage(creatorId: number, postId: number, imageId: number) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
      include: { category: true, images: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.category.creatorId !== creatorId) {
      throw new BadRequestException('You can only update your own posts');
    }

    const image = post.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException('Image not found on this post');
    }

    await this.storageService.deleteFile(image.key);

    await this.prisma.postImage.delete({
      where: { id: imageId },
    });

    return this.getPostByCreator(creatorId, postId);
  }

  async initiateMediaUpload(
    creatorId: number,
    postId: number,
    contentType: string,
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

    return this.storageService.getPresignedPutUrl(key, contentType, true);
  }

  async confirmMediaUpload(
    creatorId: number,
    postId: number,
    contentType: string,
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

    const extension = contentType.split('/')[1] || 'mp4';
    const key = `posts/${postId}/media.${extension}`;

    await this.prisma.postMedia.upsert({
      where: { postId },
      update: {
        mediaKey: key,
        uploaded:
          post.type === PostType.VIDEO ? !!post.media?.previewKey : true,
      },
      create: {
        postId,
        mediaKey: key,
        uploaded:
          post.type === PostType.VIDEO ? !!post.media?.previewKey : true,
      },
    });

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

    if (post.media?.previewKey) {
      await this.storageService.deleteFile(post.media.previewKey);
    }

    const { key } = await this.storageService.uploadSmallFile({
      key: `posts/${postId}/preview.${file.originalname.split('.').pop()}`,
      buffer: file.buffer,
      contentType: file.mimetype,
      isPrivate: true,
    });

    await this.prisma.postMedia.update({
      where: { postId },
      data: {
        previewKey: key,
        uploaded: !!post.media?.mediaKey,
      },
    });

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
                    isEnded: { equals: false },
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

    if (post.status != 'ACTIVE') {
      throw new NotFoundException('Post is not found');
    }

    if (!post?.media) {
      return null;
    }

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

    return {
      ...post.media,
      mediaUrl: post.media.mediaKey
        ? await this.storageService.getPresignedUrl(post.media.mediaKey)
        : undefined,
      previewUrl: post.media.previewKey
        ? await this.storageService.getPresignedUrl(post.media.previewKey)
        : undefined,
    };
  }

  async searchPosts(
    userId: number | undefined,
    dto: SearchPostsUsersDto,
  ): Promise<{ posts: PostResponseDto[]; total: number }> {
    const { page, limit, categoryId, name, type, creatorId } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      category: {
        creatorId,
      },
      status: PostStatus.ACTIVE,
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
    };

    const total = await this.prisma.post.count({ where });

    const raws = await this.prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  where: {
                    userId: userId ?? 0,
                    isEnded: { equals: false },
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

    const posts = await Promise.all(
      raws.map(async (post) => {
        const hasSubscription = post.category.creator.subscriptions.some(
          (sub) =>
            sub.plan.creatorCategories.some((c) => c.id === post.categoryId),
        );
        const hasAccess =
          post.category.isPublic || (!!userId && hasSubscription);

        if (userId && hasAccess) {
          return this.buildFullDto(post);
        }

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
      hasAccess: false,
    };
  }

  private async buildFullDto(post: RawPostWithSubs): Promise<PostResponseDto> {
    const headerUrl = post.headerKey
      ? await this.storageService.getPresignedUrl(post.headerKey)
      : undefined;

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
      hasAccess: true,

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
      where: { id: postId, status: 'ACTIVE' },
      include: {
        category: {
          include: {
            creator: {
              include: {
                subscriptions: {
                  where: {
                    userId,
                    isEnded: { equals: false },
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

    if (post.category.isPublic) {
      return true;
    }

    return post.category.creator.subscriptions.some(
      (subscription) =>
        !subscription.isEnded &&
        subscription.plan.creatorCategories.some(
          (category) => category.id === post.categoryId,
        ),
    );
  }

  async likePost(userId: number, postId: number) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, postId);
    if (!hasAccess) throw new ForbiddenException();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.postLike.create({
          data: { postId: postId, userId },
        });
        await tx.post.update({
          where: { id: postId },
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

  async repostPost(userId: number, postId: number) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, postId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this post');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.postRepost.create({
        data: { postId: postId, userId },
      });
      await tx.post.update({
        where: { id: postId },
        data: { repostsCount: { increment: 1 } },
      });
    });
  }

  async votePoll(userId: number, dto: VotePollDto) {
    const hasAccess = await this.checkUserHasAccessToPost(userId, dto.pollId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this poll');
    }

    const poll = await this.prisma.poll.findUnique({
      where: { postId: dto.pollId },
      include: { options: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.isClosed) {
      throw new BadRequestException('This poll is closed');
    }

    const existingVote = await this.prisma.pollVote.findUnique({
      where: {
        unique_vote_per_poll: { pollId: poll.id, userId },
      },
    });
    if (existingVote) {
      throw new ConflictException('You have already voted in this poll');
    }

    if (!poll.options.some((opt) => opt.id === dto.optionId)) {
      throw new NotFoundException('Poll option not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pollVote.create({
        data: {
          pollId: poll.id,
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

    return this.getPostById(dto.pollId, userId);
  }

  async createComment(
    userId: number,
    createCommentDto: CreateCommentDto,
    postId: number,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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

    const hasAccess = await this.checkUserHasAccessToPost(userId, post.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this post');
    }

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
        postId: postId,
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

  async searchCreatorPosts(
    creatorId: number,
    dto: SearchPostsDto,
  ): Promise<{ posts: PostResponseDto[]; total: number }> {
    const { page, limit, categoryId, name, type } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      category: { creatorId },
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
    };

    const total = await this.prisma.post.count({ where });

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

    const posts = await Promise.all(
      raws.map((raw) => this.buildFullDto(raw as any)),
    );

    return { posts, total };
  }

  async getPostByCreator(
    creatorId: number,
    postId: number,
  ): Promise<PostResponseDto> {
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
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!raw) {
      throw new NotFoundException('Post not found');
    }

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
        ready = !!post.name && post.poll?.options?.length > 1;
        break;
      case PostType.AUDIO:
        ready = !!post.name && post.media?.uploaded === true;
        break;
      case PostType.VIDEO:
        ready =
          !!post.name &&
          post.media?.uploaded === true &&
          typeof post.media.previewKey === 'string';
        break;
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { isReadyForActivation: ready },
    });
  }
}
