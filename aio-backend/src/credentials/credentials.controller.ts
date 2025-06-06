import {
  Controller,
  Post,
  Delete,
  Param,
  HttpCode,
  UseGuards,
  Req,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { CredentialsGuard } from './credentials.guard';
import { Response } from 'express';
import { Public, User } from 'src/auth/decorators';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { PrismaService } from '../prisma/prisma.service';

@Controller('credentials')
export class CredentialsController {
  constructor(
    private readonly credentialsSvc: CredentialsService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post()
  async createCredential(
    @User(GetCreatorIdPipe) creatorId: number,
    @Res() res: Response,
  ) {
    const { clientId, clientSecret } =
      await this.credentialsSvc.createCredential(creatorId);
    res.send({ clientId, clientSecret });
  }

  @HttpCode(204)
  @Delete(':clientId')
  async revoke(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('clientId') clientId: string,
  ): Promise<void> {
    await this.credentialsSvc.revokeCredential(creatorId, clientId);
  }

  @Get()
  async listCredentials(
    @User(GetCreatorIdPipe) creatorId: number,
    @Res() res: Response,
  ) {
    const creds = await this.prismaService.creatorApiCredential.findMany({
      where: { creatorId, isActive: true },
      select: {
        clientId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.send(creds);
  }

  @Public()
  @UseGuards(CredentialsGuard)
  @Get('/creator/plans')
  async getCreatorPlans(@Req() req: any, @Res() res: Response) {
    const creatorId = req.creatorId;
    const plans = await this.prismaService.plan.findMany({
      where: { creatorId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        interval: true,
        intervalCount: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.send(plans);
  }

  @Public()
  @UseGuards(CredentialsGuard)
  @Get('/creator/followers')
  async getCreatorFollowers(@Req() req: any, @Res() res: Response) {
    const creatorId = req.creatorId;
    const followers = await this.prismaService.follow.findMany({
      where: { creatorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userName: true,
          },
        },
      },
    });
    res.send(followers);
  }

  @Public()
  @UseGuards(CredentialsGuard)
  @Get('/creator/subscription')
  async getSubscriptionInfo(
    @Req() req: any,
    @Query('userId') userIdParam: string,
    @Res() res: Response,
  ) {
    const creatorId = req.creatorId;
    const userId = parseInt(userIdParam, 10);
    const subscription = await this.prismaService.subscription.findFirst({
      where: { creatorId, userId, isEnded: false },
      select: {
        id: true,
        currentPeriodEnd: true,
        isCancelled: true,
        isEnded: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!subscription) {
      res.send({ subscription: null });
    }
    res.send(subscription);
  }
}
