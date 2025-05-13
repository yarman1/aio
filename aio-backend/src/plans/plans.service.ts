import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from './types/interval.enum';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateCreatorCategoryDto } from './dto/create-creator-category.dto';
import {
  CreatorCategory,
  ExternalBenefit,
  Prisma,
} from '../generated/prisma/client';
import { CreateExternalBenefitDto } from './dto/create-external-benefit.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

interface PriceInfo {
  priceId: string;
  price: string;
  interval: Interval;
  intervalCount: number;
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @Inject('StripeClient') private readonly stripeClient: Stripe,
    private readonly prismaService: PrismaService,
  ) {}

  async createPlan(dto: CreatePlanDto, creatorId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        id: creatorId,
      },
    });

    if (!creator.isStripeAccountVerified) {
      throw new ForbiddenException(
        'You must complete Stripe verification before creating plans',
      );
    }

    if (!dto.categoryIds?.length && !dto.externalBenefits?.length) {
      throw new BadRequestException(
        'Plan must have at least one creator category or external benefit',
      );
    }

    const categories = await this.prismaService.creatorCategory.findMany({
      where: {
        id: { in: dto.categoryIds },
        creatorId,
        isPublic: false,
      },
      select: { id: true },
    });

    const benefits = await this.prismaService.externalBenefit.findMany({
      where: { id: { in: dto.externalBenefits }, creatorId },
      select: {
        id: true,
      },
    });

    if (categories.length !== (dto.categoryIds?.length ?? 0)) {
      throw new BadRequestException(
        'One or more categories are invalid or public and cannot be assigned',
      );
    }

    if (benefits.length !== dto.externalBenefits.length) {
      throw new BadRequestException('One or more benefit is not found');
    }

    if (dto.price.includes('-')) {
      throw new BadRequestException('Price must be positive');
    }
    const priceInCents = (parseFloat(dto.price) * 100).toFixed(0);

    const newProduct = await this.stripeClient.products.create({
      name: dto.name,
      description: dto.description,
      default_price_data: {
        currency: 'USD',
        recurring: {
          interval: dto.intervalType,
          interval_count: dto.intervalCount,
        },
        unit_amount_decimal: priceInCents,
      },
      expand: ['default_price'],
    });

    const priceInfo = this.checkPriceObject(newProduct);
    if (priceInfo == null) {
      this.logger.error('Price info is null');
      throw new InternalServerErrorException('Internal server error');
    }

    const data: Prisma.PlanCreateInput = {
      creator: {
        connect: { id: creator.id },
      },
      productId: newProduct.id,
      name: newProduct.name,
      createdAt: new Date(newProduct.created),
      description: newProduct.description,
      ...priceInfo,
    };

    if (dto.categoryIds?.length) {
      data.creatorCategories = {
        connect: dto.categoryIds.map((id) => ({ id })),
      };
    }

    if (dto.externalBenefits?.length) {
      data.externalBenefits = {
        connect: dto.externalBenefits.map((id) => ({ id })),
      };
    }

    const plan = await this.prismaService.plan.create({
      data,
      include: {
        externalBenefits: true,
        creatorCategories: true,
      },
    });
    return plan;

    // return {
    //   id: newProduct.id,
    //   name: newProduct.name,
    //   active: newProduct.active,
    //   created: new Date(newProduct.created).toUTCString(),
    //   description: newProduct.description,
    //   ...priceInfo,
    // };
  }

  async getAllCreatorCategories(creatorId: number): Promise<CreatorCategory[]> {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        id: creatorId,
      },
      select: {
        creatorCategories: true,
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator.creatorCategories;
  }

  async getCreatorCategoriesPublic(creatorId: number) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        id: creatorId,
      },
      include: {
        creatorCategories: {
          where: {
            OR: [{ isPublic: true }, { plans: { some: {} } }],
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator.creatorCategories;
  }

  async getAllExternalBenefits(creatorId: number): Promise<ExternalBenefit[]> {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        id: creatorId,
      },
      select: {
        externalBenefits: true,
      },
    });

    return creator.externalBenefits;
  }

  async createCreatorCategory(
    creatorId: number,
    dto: CreateCreatorCategoryDto,
  ) {
    return this.prismaService.creatorCategory.create({
      data: {
        name: dto.name,
        creatorId,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async deleteCreatorCategory(creatorId: number, categoryId: number) {
    const creatorCategory = await this.prismaService.creatorCategory.findUnique(
      {
        where: {
          id: categoryId,
          creatorId,
        },
      },
    );
    if (!creatorCategory) {
      throw new NotFoundException('This creator category is not found');
    }
    await this.prismaService.creatorCategory.delete({
      where: {
        id: categoryId,
      },
    });
  }

  async deleteExternalBenefit(creatorId: number, benefitId: number) {
    const externalBenefit = await this.prismaService.externalBenefit.findUnique(
      {
        where: {
          id: benefitId,
          creatorId,
        },
      },
    );
    if (!externalBenefit) {
      throw new NotFoundException('This external benefit is not found');
    }
    await this.prismaService.externalBenefit.delete({
      where: {
        id: benefitId,
      },
    });
  }

  async createExternalBenefit(
    creatorId: number,
    dto: CreateExternalBenefitDto,
  ) {
    return this.prismaService.externalBenefit.create({
      data: {
        name: dto.name,
        creatorId,
      },
    });
  }

  async updatePlan(creatorId: number, dto: UpdatePlanDto) {
    const plan = await this.prismaService.plan.findUnique({
      where: { id: dto.planId },
      select: { creatorId: true, productId: true },
    });
    if (!plan || plan.creatorId !== creatorId) {
      throw new BadRequestException('Plan does not exist');
    }

    const validCategories = await this.prismaService.creatorCategory.findMany({
      where: {
        id: { in: dto.categoryIds },
        creatorId,
        isPublic: false,
      },
      select: { id: true },
    });
    if (validCategories.length !== dto.categoryIds.length) {
      throw new BadRequestException(
        'One or more categories are invalid or public and cannot be assigned',
      );
    }

    const validBenefits = await this.prismaService.externalBenefit.findMany({
      where: {
        id: { in: dto.externalBenefits },
        creatorId,
      },
      select: { id: true },
    });
    if (validBenefits.length !== dto.externalBenefits.length) {
      throw new BadRequestException(
        'One or more external benefits are invalid or not owned by you',
      );
    }

    await this.stripeClient.products.update(plan.productId, {
      name: dto.name,
      description: dto.description,
    });

    return this.prismaService.plan.update({
      where: { id: dto.planId },
      data: {
        name: dto.name,
        description: dto.description,
        creatorCategories: {
          set: dto.categoryIds.map((id) => ({ id })),
        },
        externalBenefits: {
          set: dto.externalBenefits.map((id) => ({ id })),
        },
      },
      include: {
        creatorCategories: true,
        externalBenefits: true,
      },
    });
  }

  async getPlanById(planId: number, creatorId: number) {
    const plan = await this.prismaService.plan.findUnique({
      where: {
        id: planId,
        creatorId,
      },
    });
    if (!plan) {
      throw new NotFoundException('This plan is not existed');
    }

    return plan;
  }

  async getPlanPublic(planId: number) {
    const plan = await this.prismaService.plan.findFirst({
      where: {
        id: planId,
        isArchived: false,
        OR: [
          { externalBenefits: { some: {} } },
          { creatorCategories: { some: {} } },
        ],
      },
      include: {
        externalBenefits: true,
        creatorCategories: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('This plan is not available publicly');
    }

    return plan;
  }

  async getPlans(creatorId: number) {
    return this.prismaService.plan.findMany({
      where: {
        creatorId,
      },
    });
  }

  async getPlansPublic(creatorId: number) {
    return this.prismaService.plan.findMany({
      where: {
        creatorId,
        isArchived: false,
        OR: [
          { externalBenefits: { some: {} } },
          { creatorCategories: { some: {} } },
        ],
      },
      include: {
        externalBenefits: true,
        creatorCategories: true,
      },
    });
  }

  // archive, cancel all subscriptions and notify through email
  async changePlanStatus(creatorId: number, planId: number) {
    // 1) Verify plan exists & belongs to this creator
    const plan = await this.prismaService.plan.findUnique({
      where: { id: planId },
      select: { creatorId: true, isArchived: true },
    });
    if (!plan || plan.creatorId !== creatorId) {
      throw new NotFoundException('Plan not found');
    }

    // 2) Toggle archive flag
    const willArchive = !plan.isArchived;
    const updatedPlan = await this.prismaService.plan.update({
      where: { id: planId },
      data: { isArchived: willArchive },
    });

    // 3) Fetch all non-ended subscriptions to this plan
    const subs = await this.prismaService.subscription.findMany({
      where: { planId, isEnded: false },
    });

    if (willArchive) {
      // — ARCHIVE: cancel at period end & mark cancelled
      for (const s of subs) {
        try {
          await this.stripeClient.subscriptions.update(s.subscriptionStripeId, {
            cancel_at_period_end: true,
          });
        } catch (err) {
          this.logger.error(
            `Stripe error cancelling subscription ${s.subscriptionStripeId}`,
            err,
          );
          throw new InternalServerErrorException();
        }
      }
      await this.prismaService.subscription.updateMany({
        where: { planId, isEnded: false },
        data: {
          isCancelled: true,
          cancelationReason: 'plan_archived',
          updatedAt: new Date(),
        },
      });
    } else {
      // — UN-ARCHIVE: reopen any previously cancelled subscriptions
      for (const s of subs.filter((x) => x.isCancelled)) {
        try {
          await this.stripeClient.subscriptions.update(s.subscriptionStripeId, {
            cancel_at_period_end: false,
          });
        } catch (err) {
          this.logger.error(
            `Stripe error reinstating subscription ${s.subscriptionStripeId}`,
            err,
          );
          throw new InternalServerErrorException();
        }
      }
      await this.prismaService.subscription.updateMany({
        where: { planId, isEnded: false, isCancelled: true },
        data: {
          isCancelled: false,
          cancelationReason: null,
          updatedAt: new Date(),
        },
      });
    }

    // 4) Notify users (you can hook in your email service here)
    for (const s of subs) {
      this.logger.log(
        `TODO: notify user ${s.userId} that plan ${planId} has been ${
          willArchive ? 'archived' : 'restored'
        }`,
      );
    }

    return updatedPlan;
  }

  async getMyArchivedPlan(userId: number, planId: number) {
    const sub = await this.prismaService.subscription.findFirst({
      where: {
        userId,
        planId,
        isEnded: false,
      },
      select: { creatorId: true },
    });
    if (!sub) {
      throw new NotFoundException(
        `No active subscription found for user ${userId} & plan ${planId}`,
      );
    }

    const plan = await this.prismaService.plan.findFirst({
      where: {
        id: planId,
        creatorId: sub.creatorId,
        isArchived: true,
      },
      include: {
        creatorCategories: true,
        externalBenefits: true,
      },
    });
    if (!plan) {
      throw new NotFoundException(
        `Archived plan ${planId} not found for creator ${sub.creatorId}`,
      );
    }

    return plan;
  }

  private checkPriceObject(product: Stripe.Product): PriceInfo | null {
    let price: string | null = null;
    let interval: Interval | null = null;
    let intervalCount: number | null = null;
    let priceId: string | null = null;

    if (
      !product.default_price &&
      !(typeof product.default_price === 'object')
    ) {
      return null;
    }

    if (product.default_price && typeof product.default_price === 'object') {
      const defaultPrice = product.default_price;
      if (defaultPrice.unit_amount_decimal) {
        price = (parseFloat(defaultPrice.unit_amount_decimal) / 100).toFixed(2);
      }
      if (defaultPrice.recurring) {
        interval = defaultPrice.recurring.interval;
        intervalCount = defaultPrice.recurring.interval_count;
      }
      if (defaultPrice.id) {
        priceId = defaultPrice.id;
      }
    }

    return {
      priceId,
      price,
      interval,
      intervalCount,
    };
  }
}
