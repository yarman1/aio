import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { StripeAccountLink } from './types/stripe-account-link.type';
import { v4 as uuid } from 'uuid';
import { StorageService } from '../storage/storage.service';
import { SearchCreatorsDto } from './dto/search-creators.dto';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class CreatorsService {
  constructor(
    @Inject('StripeClient') private readonly stripeClient: Stripe,
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async getCreatorStripeOnboardingLink(
    clientType: string,
    userId: number,
    creatorUsername: string,
  ) {
    if (
      await this.prismaService.creator.findUnique({
        where: {
          creatorUsername,
        },
      })
    ) {
      throw new ForbiddenException('This creator username is already taken');
    }
    const user = await this.usersService.findUserById(userId);
    if (!user.isEmailConfirmed) {
      throw new ForbiddenException('Email is not confirmed');
    }

    const account = await this.stripeClient.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        transfers: {
          requested: true,
        },
      },
    });

    // account creation error handling

    await this.prismaService.creator.create({
      data: {
        userId,
        connectAccountId: account.id,
        creatorUsername: creatorUsername,
      },
    });

    const url = await this.getAccountLinkUrl(
      clientType,
      account.id,
      'account_onboarding',
    );

    return {
      url,
    };
  }

  async getCreatorStripeUpdateLink(clientType: string, userId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        userId,
      },
    });
    if (!creator) {
      throw new NotFoundException(
        'Creator account does not exist for this user',
      );
    }
    const url = await this.getAccountLinkUrl(
      clientType,
      creator.connectAccountId,
      'account_update',
    );
    return {
      url,
    };
  }

  async readCreator(userId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: { userId },
      select: {
        id: true,
        creatorUsername: true,
        description: true,
        avatarUrl: true,
        isStripeAccountVerified: true,
      },
    });
    if (!creator) {
      throw new NotFoundException(
        'Creator account does not exist for this user',
      );
    }
    return creator;
  }

  async readCreatorPublic(creatorUsername: string) {
    const creator = await this.prismaService.creator.findUnique({
      where: { creatorUsername },
      select: {
        id: true,
        creatorUsername: true,
        description: true,
        avatarUrl: true,
        isStripeAccountVerified: true,
      },
    });
    if (!creator) {
      throw new NotFoundException('This creator does not exist');
    }
    return creator;
  }

  async userOwnsCreator(userId: number, creatorId: number): Promise<boolean> {
    const count = await this.prismaService.creator.count({
      where: { id: creatorId, userId },
    });
    return count > 0;
  }

  async getCreatorStripeDashboardUrl(userId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        userId,
      },
    });
    if (!creator.isStripeAccountVerified) {
      throw new ForbiddenException('Creator account is not verified');
    }

    const url = (
      await this.stripeClient.accounts.createLoginLink(creator.connectAccountId)
    ).url;
    return {
      url,
    };
  }

  private async getAccountLinkUrl(
    clientType: string,
    accountId: string,
    type: StripeAccountLink,
  ) {
    const refreshUrl =
      clientType === 'web'
        ? this.configService.get<string>('STRIPE_ACCOUNT_LINK_REFRESH_URL_WEB')
        : clientType === 'mobile'
          ? this.configService.get<string>(
              'STRIPE_ACCOUNT_LINK_REFRESH_URL_MOBILE',
            )
          : '';
    const returnUrl =
      clientType === 'web'
        ? this.configService.get<string>('STRIPE_ACCOUNT_LINK_RETURN_URL_WEB')
        : clientType === 'mobile'
          ? this.configService.get<string>(
              'STRIPE_ACCOUNT_LINK_RETURN_URL_MOBILE',
            )
          : '';
    if (!refreshUrl || !returnUrl) {
      throw new InternalServerErrorException('Internal server error');
    }
    const accountLink = await this.stripeClient.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: type,
    });

    return accountLink.url;
  }

  async setAvatar(
    creatorId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const user = await this.prismaService.creator.findUnique({
      where: { id: creatorId },
      select: { avatarKey: true },
    });
    if (!user) throw new NotFoundException('Creator not found');

    if (user.avatarKey) {
      await this.storage.deleteFile(user.avatarKey, false);
    }

    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `avatars/creators/${creatorId}-${uuid()}.${ext}`;

    const { key: avatarKey, url: avatarUrl } =
      await this.storage.uploadSmallFile({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
        isPrivate: false,
      });

    await this.prismaService.creator.update({
      where: { id: creatorId },
      data: {
        avatarKey,
        avatarUrl,
      },
    });

    return avatarUrl;
  }

  async followCreator(userId: number, creatorId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: { id: creatorId },
      select: { userId: true },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    if (creator.userId === userId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    try {
      // 1) create the business-state “Follow” (skip if already exists)
      const follow = await this.prismaService.follow.create({
        data: { userId, creatorId },
      });

      // 2) log raw analytics event
      await this.prismaService.followEvent.create({
        data: {
          userId,
          creatorId,
          type: 'FOLLOWED',
        },
      });

      return follow;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('You are already following this creator');
      }
      throw err;
    }
  }

  async unfollowCreator(userId: number, creatorId: number) {
    const activeSub = await this.prismaService.subscription.findFirst({
      where: { userId, creatorId, isEnded: false },
    });
    if (activeSub) {
      throw new ForbiddenException(
        'Cannot unfollow while you have an active subscription',
      );
    }

    const existing = await this.prismaService.follow.findUnique({
      where: { userId_creatorId: { userId, creatorId } },
    });
    if (!existing) {
      throw new NotFoundException('You are not following this creator');
    }

    // 1) log raw “UNFOLLOWED” event, then 2) delete the business-state “Follow”
    await this.prismaService.$transaction([
      this.prismaService.followEvent.create({
        data: {
          userId,
          creatorId,
          type: 'UNFOLLOWED',
        },
      }),
      this.prismaService.follow.delete({
        where: { userId_creatorId: { userId, creatorId } },
      }),
    ]);
  }

  async getFollowedCreators(userId: number) {
    const follows = await this.prismaService.follow.findMany({
      where: { userId },
      include: {
        creator: {
          select: {
            id: true,
            creatorUsername: true,
            description: true,
            avatarUrl: true,
            isStripeAccountVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return follows.map((f) => f.creator);
  }

  async isFollowing(userId: number, creatorId: number): Promise<boolean> {
    const count = await this.prismaService.follow.count({
      where: { userId, creatorId },
    });
    return count > 0;
  }

  async searchCreators(dto: SearchCreatorsDto) {
    const { name, page, limit } = dto;
    const where: Prisma.CreatorWhereInput = {
      ...(name
        ? { creatorUsername: { contains: name, mode: 'insensitive' } }
        : {}),
    };

    const total = await this.prismaService.creator.count({ where });
    const raws = await this.prismaService.creator.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        creatorUsername: true,
        description: true,
        avatarUrl: true,
        isStripeAccountVerified: true,
      },
    });

    return { creators: raws, total };
  }
}
