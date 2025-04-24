import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    @Inject('StripeClient') private readonly stripe: Stripe,
    private readonly prismaService: PrismaService,
  ) {}

  async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdatedInfo(
          event.data.object as Stripe.Account,
        );
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleAccountUpdatedInfo(account: Stripe.Account) {
    try {
      if (account.charges_enabled && account.payouts_enabled) {
        const creator = await this.prismaService.creator.findUnique({
          where: {
            connectAccountId: account.id,
          },
        });
        if (creator && !creator.isStripeAccountVerified) {
          await this.prismaService.creator.update({
            where: {
              connectAccountId: account.id,
            },
            data: {
              isStripeAccountVerified: true,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Stripe account update is failed', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
