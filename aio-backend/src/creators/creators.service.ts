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

@Injectable()
export class CreatorsService {
  constructor(
    @Inject('StripeClient') private readonly stripeClient: Stripe,
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
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
      where: {
        userId,
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
      where: {
        creatorUsername,
      },
    });
    if (!creator) {
      throw new NotFoundException('This creator does not exist');
    }
    return creator;
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
}
