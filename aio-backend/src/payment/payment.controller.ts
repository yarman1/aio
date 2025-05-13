import {
  Controller,
  HttpStatus,
  Inject,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PaymentWebhookService } from './payment.webhook.service';
import { Public } from 'src/auth/decorators';
import { Request, Response } from 'express';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  private readonly platformWebhookSecret: string;
  private readonly connectWebhookSecret: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentWebhookService: PaymentWebhookService,
    private readonly configService: ConfigService,
    @Inject('StripeClient') private readonly stripe: Stripe,
  ) {
    this.platformWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET_PLATFORM',
    );
    this.connectWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET_CONNECT',
    );
  }

  @Public()
  @Post('webhook')
  async handlePlatformWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const signature = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.platformWebhookSecret,
      );
    } catch (e) {
      res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${e.message}`);
      return;
    }

    await this.paymentWebhookService.handleEvent(event);
    res.json({ received: true });
  }

  @Public()
  @Post('webhook/connected')
  async handleConnectWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const signature = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.connectWebhookSecret,
      );
    } catch (e) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(`Webhook Error: ${(e as Error).message}`);
    }

    try {
      await this.paymentWebhookService.handleEventConnect(event);
      return res.json({ received: true });
    } catch {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Webhook handling error');
    }
  }
}
