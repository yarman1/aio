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
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentWebhookService: PaymentWebhookService,
    private readonly configService: ConfigService,
    @Inject('StripeClient') private readonly stripe: Stripe,
  ) {
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_KEY');
  }

  @Public()
  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const signature = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (e) {
      res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${e.message}`);
      return;
    }

    await this.paymentWebhookService.handleEvent(event);
    res.json({ received: true });
  }
}
