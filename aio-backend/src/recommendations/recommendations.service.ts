import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';

@Injectable()
export class RecommendationsService {
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async recommendCategory(
    categoryId: number,
    date: Date,
    creatorId: number,
  ): Promise<string> {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: { creatorCategories: true },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    if (!creator.creatorCategories.some((c) => c.id === categoryId)) {
      throw new NotFoundException(
        'This category does not belong to the specified creator',
      );
    }

    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    const stats = await this.prisma.creatorCategoryStats.findUnique({
      where: {
        creatorCategoryId_date: {
          creatorCategoryId: categoryId,
          date: dayStart,
        },
      },
    });
    if (!stats) {
      throw new NotFoundException(
        'No stats found for this category on that date',
      );
    }

    const prompt = `
You are a data-driven coach. Here are yesterday's metrics for the category '${stats.categoryName}':

• Views: ${stats.views}
• Likes: ${stats.likes}
• Reposts: ${stats.reposts}
• Comments: ${stats.comments}
• Poll votes: ${stats.votes}
• Video plays: ${stats.plays}

Based on these numbers, provide 2–3 concise recommendations to improve engagement in this category.
`;

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1';
    const res = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You give concise, actionable tips.' },
        { role: 'user', content: prompt },
      ],
    });

    return res.choices[0].message.content.trim();
  }

  async recommendPlan(
    planId: number,
    date: Date,
    creatorId: number,
  ): Promise<string> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, creatorId: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    if (plan.creatorId !== creatorId) {
      throw new NotFoundException(
        'This plan does not belong to the specified creator',
      );
    }

    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    const stats = await this.prisma.planStats.findUnique({
      where: { planId_date: { planId, date: dayStart } },
    });
    if (!stats) {
      throw new NotFoundException(
        'No subscription stats for this plan on that date',
      );
    }

    const prompt = `
You are a subscription-growth expert. Here are yesterday's subscription metrics for the plan '${plan.name}':

• New subscriptions: ${stats.subsCreated}
• Renewals: ${stats.subsRenewed}
• Cancellations: ${stats.subsCanceled}
• Expirations: ${stats.subsExpired}

Based on these numbers, provide 2–3 concise recommendations to improve subscription growth and retention for this plan.
`;

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1';
    const res = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You give concise, actionable tips.' },
        { role: 'user', content: prompt },
      ],
    });

    return res.choices[0].message.content.trim();
  }
}
