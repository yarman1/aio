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
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionEnded(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  async handleEventConnect(event: Stripe.Event) {
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

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    if (session.mode !== 'subscription' || !session.subscription) {
      return;
    }

    try {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

      const { userId, creatorId, planId } = session.metadata ?? {};
      if (!userId || !creatorId || !planId) {
        this.logger.error(
          'Missing metadata on checkout.session.completed',
          session.metadata,
        );
        return;
      }

      const stripeSub =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      await this.prismaService.$transaction(async (tx) => {
        const newSubscription = await tx.subscription.create({
          data: {
            subscriptionStripeId: subscriptionId,
            createdAt: new Date(stripeSub.created * 1000),
            updatedAt: new Date(),
            currentPeriodEnd: new Date(
              stripeSub.items.data[0].current_period_end * 1000,
            ),
            isCancelled: false,
            isEnded: false,
            planId: parseInt(planId, 10),
            userId: parseInt(userId, 10),
            creatorId: parseInt(creatorId, 10),
          },
        });

        await tx.follow.createMany({
          data: [
            {
              userId: parseInt(userId, 10),
              creatorId: parseInt(creatorId, 10),
            },
          ],
          skipDuplicates: true,
        });

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: newSubscription.id,
            type: 'CREATED',
          },
        });
      });

      this.logger.log(
        `Subscription ${subscriptionId} recorded for user ${userId}`,
      );
    } catch (err) {
      this.logger.error('Error in handleCheckoutSessionCompleted', err);
      throw new InternalServerErrorException();
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const subId = await this.getSubscriptionIdFromInvoice(invoice);
    if (!subId) {
      this.logger.warn(
        `Skipping invoice.payment_succeeded: no subscription on invoice ${invoice.id}`,
      );
      return;
    }

    try {
      const periodEnd = invoice.lines.data[0]?.period?.end;
      if (!periodEnd) {
        this.logger.warn(`Cannot find period_end on invoice ${invoice.id}`);
        return;
      }

      const isSubExist = await this.prismaService.subscription.findUnique({
        where: {
          subscriptionStripeId: subId,
        },
      });
      if (!isSubExist) {
        return;
      }

      const subscription = await this.prismaService.subscription.update({
        where: { subscriptionStripeId: subId },
        data: {
          currentPeriodEnd: new Date(periodEnd * 1000),
          updatedAt: new Date(),
        },
      });

      await this.prismaService.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: 'RENEWED',
        },
      });

      this.logger.log(
        `Subscription ${subId} extended to ${new Date(
          periodEnd * 1000,
        ).toISOString()}`,
      );
    } catch (err) {
      this.logger.error('Error in handleInvoicePaymentSucceeded', err);
      throw new InternalServerErrorException();
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const isSubExist = await this.prismaService.subscription.findUnique({
        where: {
          subscriptionStripeId: subscription.id,
        },
      });
      if (!isSubExist) {
        return;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId
        ? await this.prismaService.plan.findUnique({
            where: { priceId },
          })
        : null;

      const updateData: any = {
        isCancelled: subscription.cancel_at_period_end ?? false,
        currentPeriodEnd: new Date(
          subscription.items.data[0].current_period_end * 1000,
        ),
        updatedAt: new Date(),
      };
      if (plan) updateData.planId = plan.id;

      if (subscription.status === 'canceled') {
        updateData.isEnded = true;
      }

      const updatedSubscription = await this.prismaService.subscription.update({
        where: {
          subscriptionStripeId: subscription.id,
        },
        data: updateData,
      });

      if (subscription.cancel_at_period_end) {
        await this.prismaService.subscriptionEvent.create({
          data: {
            subscriptionId: updatedSubscription.id,
            type: 'CANCELED',
          },
        });
      }

      this.logger.log(`Subscription ${subscription.id} updated in DB`);
    } catch (err) {
      this.logger.error('Error in handleSubscriptionUpdated', err);
      throw new InternalServerErrorException();
    }
  }

  private async handleSubscriptionEnded(subscription: Stripe.Subscription) {
    try {
      const updatedSubscription = await this.prismaService.subscription.update({
        where: {
          subscriptionStripeId: subscription.id,
        },
        data: {
          isEnded: true,
          updatedAt: new Date(),
        },
      });

      await this.prismaService.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSubscription.id,
          type: 'EXPIRED',
        },
      });
      this.logger.log(`Subscription ${subscription.id} marked as ended`);
    } catch (err) {
      this.logger.error('Error in handleSubscriptionEnded', err);
      throw new InternalServerErrorException();
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subId = await this.getSubscriptionIdFromInvoice(invoice);
    if (!subId) {
      this.logger.warn(
        `Skipping invoice.payment_failed: no subscription on invoice ${invoice.id}`,
      );
      return;
    }

    try {
      await this.stripe.subscriptions.cancel(subId);

      const updatedSubscription = await this.prismaService.subscription.update({
        where: { subscriptionStripeId: subId },
        data: {
          isCancelled: true,
          isEnded: true,
          cancelationReason: 'payment_failed',
          updatedAt: new Date(),
        },
      });

      await this.prismaService.subscriptionEvent.create({
        data: {
          subscriptionId: updatedSubscription.id,
          type: 'CANCELED',
        },
      });

      this.logger.warn(
        `Subscription ${subId} cancelled and ended due to failed invoice ${invoice.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Error cancelling+ending subscription ${subId} on payment_failed`,
        err,
      );
      throw new InternalServerErrorException();
    }
  }

  private async handleAccountUpdatedInfo(account: Stripe.Account) {
    try {
      const creator = await this.prismaService.creator.findUnique({
        where: { connectAccountId: account.id },
      });
      if (!creator) return;

      const isVerified = account.charges_enabled && account.payouts_enabled;

      await this.prismaService.creator.update({
        where: { id: creator.id },
        data: { isStripeAccountVerified: isVerified },
      });
    } catch (error) {
      this.logger.error('Stripe account update failed', error);
      throw new InternalServerErrorException();
    }
  }

  private async getSubscriptionIdFromInvoice(
    invoice: Stripe.Invoice,
  ): Promise<string | undefined> {
    if (
      invoice.parent?.type === 'subscription_details' &&
      invoice.parent.subscription_details?.subscription
    ) {
      return invoice.parent.subscription_details.subscription as string;
    }

    const line = invoice.lines.data.find(
      (li) => li.parent?.type === 'subscription_item_details',
    );
    if (line?.parent?.type === 'subscription_item_details') {
      const subItemId = line.parent.subscription_item_details.subscription_item;
      if (subItemId) {
        const subItem = await this.stripe.subscriptionItems.retrieve(subItemId);
        return typeof subItem.subscription === 'string'
          ? subItem.subscription
          : undefined;
      }
    }

    return undefined;
  }
}
