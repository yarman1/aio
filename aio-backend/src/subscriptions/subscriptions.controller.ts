import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../auth/decorators';
import { JwtRtPayload } from '../auth/types';
import { ClientType } from '../auth/decorators/client-type.decorator';
import { ClientTypes } from '../types/client.type';
import { plainToInstance } from 'class-transformer';
import { CheckoutSessionDto } from './dto/checkout-session.dto';
import { ReadSubscriptionDto } from './dto/read-subscription.dto';
import { PortalDto } from './dto/portal.dto';
import { GetSubscriptionUpgradePreviewDTO } from './dto/get-subscription-upgrade-preview.dto';
import { PreviewSubscriptionUpgradeDto } from './dto/preview-subscription-upgrade.dto';
import { Response } from 'express';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  //async handleStripeWebhook() {}
  // webhook handled in payment

  @Get('/checkout-session/:planId')
  async checkoutSession(
    @User() user: JwtRtPayload,
    @Param('planId', ParseIntPipe) planId: number,
    @ClientType() clientType: ClientTypes,
  ) {
    const res = await this.subscriptionsService.createSubscriptionCheckoutPage(
      user.sub,
      planId,
      clientType,
    );
    return plainToInstance(CheckoutSessionDto, res);
  }

  @Get('/info/:creatorId')
  async getSubscriptionInfo(
    @User() user: JwtRtPayload,
    @Param('creatorId', ParseIntPipe) creatorId: number,
  ) {
    const res = await this.subscriptionsService.getActiveSubscription(
      user.sub,
      creatorId,
    );
    return plainToInstance(ReadSubscriptionDto, res);
  }

  @Get('/portal/:subscriptionId')
  async getPortal(
    @User() user: JwtRtPayload,
    @ClientType() clientType: ClientTypes,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
  ) {
    const res = await this.subscriptionsService.getPortal(
      user.sub,
      subscriptionId,
      clientType,
    );
    return plainToInstance(PortalDto, res);
  }

  @Post('/upgrade-preview')
  async previewSubscriptionUpgrade(
    @User() user: JwtRtPayload,
    @Body() dto: GetSubscriptionUpgradePreviewDTO,
  ) {
    const res = await this.subscriptionsService.previewSubscriptionUpgrade(
      user.sub,
      dto.subscriptionId,
      dto.newPlanId,
    );
    return plainToInstance(PreviewSubscriptionUpgradeDto, res);
  }

  @Post('/upgrade')
  async upgradeSubscription(
    @User() user: JwtRtPayload,
    @Body() dto: GetSubscriptionUpgradePreviewDTO,
    @Res() res: Response,
  ) {
    await this.subscriptionsService.upgradeSubscription(
      user.sub,
      dto.subscriptionId,
      dto.newPlanId,
    );
    res.sendStatus(HttpStatus.OK);
  }
}
