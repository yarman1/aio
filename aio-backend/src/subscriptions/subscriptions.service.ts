import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClientTypes } from '../types/client.type';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject('StripeClient') private readonly stripeClient: Stripe,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async getUserOrThrow(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.customerId)
      throw new BadRequestException(`User ${userId} has no Stripe customer`);
    return user;
  }

  private getReturnUrl(clientType: ClientTypes) {
    return clientType === 'mobile'
      ? this.configService.get<string>('SUBSCRIPTION_URL_MOBILE')
      : this.configService.get<string>('SUBSCRIPTION_URL_WEB');
  }

  async createSubscriptionCheckoutPage(
    userId: number,
    planId: number,
    clientType: ClientTypes,
  ) {
    const user = await this.getUserOrThrow(userId);

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { priceId: true, creatorId: true, creator: true },
    });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);

    if (plan.creatorId === userId) {
      throw new ForbiddenException(`You can’t subscribe to your own plan`);
    }

    const existing = await this.prisma.subscription.findFirst({
      where: { userId, creatorId: plan.creatorId, isEnded: false },
    });
    if (existing) {
      throw new ConflictException(
        `User ${userId} already subscribed to creator ${plan.creatorId}`,
      );
    }

    return this.stripeClient.checkout.sessions.create({
      //payment_method_types: ['card'],
      mode: 'subscription',
      customer: user.customerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: {
        application_fee_percent: 3,
        metadata: {
          userId: userId.toString(),
          creatorId: plan.creatorId,
          planId,
        },
        transfer_data: {
          destination: plan.creator.connectAccountId,
        },
      },
      success_url: this.getReturnUrl(clientType),
      cancel_url: this.getReturnUrl(clientType),
    });
  }

  async getPortal(
    userId: number,
    subscriptionId: number,
    clientType: ClientTypes,
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId, userId, isEnded: false },
    });
    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }
    const user = await this.getUserOrThrow(userId);

    const session = await this.stripeClient.billingPortal.sessions.create({
      customer: user.customerId,
      return_url: this.getReturnUrl(clientType),
    });
    return { url: session.url };
  }

  async getActiveSubscription(userId: number, creatorId: number) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        creatorId,
        isEnded: false,
      },
      select: {
        planId: true,
        createdAt: true,
        currentPeriodEnd: true,
        isCancelled: true,
      },
    });

    if (!sub) {
      throw new NotFoundException(
        `No active subscription to creator ${creatorId} found for user ${userId}`,
      );
    }

    return sub;
  }

  async previewSubscriptionUpgrade(
    userId: number,
    subscriptionId: number,
    newPlanId: number,
  ) {
    const subRecord = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId, userId, isEnded: false },
      select: { subscriptionStripeId: true },
    });
    if (!subRecord) {
      throw new NotFoundException(
        `Subscription ${subscriptionId} not found for user ${userId}`,
      );
    }

    const stripeSub = await this.stripeClient.subscriptions.retrieve(
      subRecord.subscriptionStripeId,
    );

    const plan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
      select: { priceId: true },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${newPlanId} not found`);
    }

    const item = stripeSub.items.data[0];
    if (!item) {
      throw new InternalServerErrorException(
        `Subscription ${subRecord.subscriptionStripeId} has no items`,
      );
    }

    const preview = await this.stripeClient.invoices.createPreview({
      customer: stripeSub.customer as string,
      subscription: subRecord.subscriptionStripeId,
      subscription_details: {
        items: [{ id: item.id, price: plan.priceId }],
        proration_behavior: 'always_invoice',
      },
    });

    return {
      upcomingInvoiceId: preview.id,
      amountDue: preview.amount_due,
      currency: preview.currency,
      lines: preview.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
      periodStart: preview.period_start,
      periodEnd: preview.period_end,
    };
  }

  async upgradeSubscription(
    userId: number,
    subscriptionId: number,
    newPlanId: number,
  ) {
    const [subRecord, plan] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { id: subscriptionId, userId, isEnded: false },
        select: { subscriptionStripeId: true },
      }),
      this.prisma.plan.findUnique({
        where: { id: newPlanId },
        select: { priceId: true },
      }),
    ]);
    if (!subRecord) {
      throw new NotFoundException(
        `Subscription ${subscriptionId} not found for user ${userId}`,
      );
    }
    if (!plan) {
      throw new NotFoundException(`Plan ${newPlanId} not found`);
    }

    const stripeSub = await this.stripeClient.subscriptions.retrieve(
      subRecord.subscriptionStripeId,
    );
    const item = stripeSub.items.data[0];
    if (!item) {
      throw new InternalServerErrorException(
        `Subscription ${subRecord.subscriptionStripeId} has no items`,
      );
    }

    const updatedSub = await this.stripeClient.subscriptions.update(
      subRecord.subscriptionStripeId,
      {
        items: [{ id: item.id, price: plan.priceId }],
        proration_behavior: 'always_invoice',
      },
    );

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        subscriptionStripeId: updatedSub.id,
        isCancelled: false,
        isEnded: false,
        cancellationComment: null,
        cancellationFeedback: null,
        cancelationReason: null,
        currentPeriodEnd: new Date(
          updatedSub.items.data[0].current_period_end * 1000,
        ),
        updatedAt: new Date(),
      },
    });

    const updatedItem = updatedSub.items.data.find((i) => i.id === item.id);
    if (!updatedItem) {
      throw new InternalServerErrorException(
        `Updated subscription missing item ${item.id}`,
      );
    }

    return {
      subscriptionId,
      currentPeriodStart: updatedItem.current_period_start,
      currentPeriodEnd: updatedItem.current_period_end,
    };
  }
}
