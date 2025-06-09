import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';
import { subDays } from 'date-fns';

@Injectable()
export class RecommendationsService {
  private openai: OpenAI;

  private readonly SYSTEM_PROMPT_CATEGORY = `You are an expert social-media coach.
Respond with exactly 3-5 numbered points, max 15 words each.
No paragraphs, no markdown styling, no extra text.`;

  private readonly SYSTEM_PROMPT_PLAN = `You are a subscription-growth strategist.
Respond with exactly 3-5 numbered points, max 15 words each.
No paragraphs, no markdown styling, no extra text.`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  private async getPreviousWeekAverage(categoryId: number, date: Date) {
    const weekAgo = subDays(date, 7);
    const twoWeeksAgo = subDays(date, 14);

    const weekStart = new Date(
      Date.UTC(
        weekAgo.getUTCFullYear(),
        weekAgo.getUTCMonth(),
        weekAgo.getUTCDate(),
      ),
    );
    const weekEnd = new Date(
      Date.UTC(
        twoWeeksAgo.getUTCFullYear(),
        twoWeeksAgo.getUTCMonth(),
        twoWeeksAgo.getUTCDate(),
      ),
    );

    const avgStats = await this.prisma.creatorCategoryStats.aggregate({
      where: {
        creatorCategoryId: categoryId,
        date: { gte: weekEnd, lt: weekStart },
      },
      _avg: {
        views: true,
        likes: true,
        reposts: true,
        comments: true,
      },
    });

    return {
      avgViews: Math.round(avgStats._avg.views || 0),
      avgLikes: Math.round(avgStats._avg.likes || 0),
      avgReposts: Math.round(avgStats._avg.reposts || 0),
      avgComments: Math.round(avgStats._avg.comments || 0),
    };
  }

  private async getPlanPreviousWeekAverage(planId: number, date: Date) {
    const weekAgo = subDays(date, 7);
    const twoWeeksAgo = subDays(date, 14);

    const weekStart = new Date(
      Date.UTC(
        weekAgo.getUTCFullYear(),
        weekAgo.getUTCMonth(),
        weekAgo.getUTCDate(),
      ),
    );
    const weekEnd = new Date(
      Date.UTC(
        twoWeeksAgo.getUTCFullYear(),
        twoWeeksAgo.getUTCMonth(),
        twoWeeksAgo.getUTCDate(),
      ),
    );

    const avgStats = await this.prisma.planStats.aggregate({
      where: {
        planId,
        date: { gte: weekEnd, lt: weekStart },
      },
      _avg: {
        subsCreated: true,
        subsRenewed: true,
        subsCanceled: true,
        subsExpired: true,
      },
    });

    return {
      avgCreated: Math.round(avgStats._avg.subsCreated || 0),
      avgRenewed: Math.round(avgStats._avg.subsRenewed || 0),
      avgCanceled: Math.round(avgStats._avg.subsCanceled || 0),
      avgExpired: Math.round(avgStats._avg.subsExpired || 0),
    };
  }

  private makeCategoryPrompt(
    categoryName: string,
    dateStr: string,
    stats: any,
    avgStats: any,
  ): string {
    const viewsTrend =
      stats.views > avgStats.avgViews
        ? '▲'
        : stats.views < avgStats.avgViews
          ? '▼'
          : '→';
    const likesTrend =
      stats.likes > avgStats.avgLikes
        ? '▲'
        : stats.likes < avgStats.avgLikes
          ? '▼'
          : '→';

    return `Category: "${categoryName}"
Date: ${dateStr}

views:     ${stats.views} ${viewsTrend}
likes:     ${stats.likes} ${likesTrend}
reposts:   ${stats.reposts}
comments:  ${stats.comments}
pollVotes: ${stats.votes}
plays:     ${stats.plays}

7-day avg views: ${avgStats.avgViews}
7-day avg likes: ${avgStats.avgLikes}

Goal: boost engagement next 7 days.
Return only the numbered list.`;
  }

  private makePlanPrompt(
    planName: string,
    dateStr: string,
    stats: any,
    avgStats: any,
  ): string {
    const createdTrend =
      stats.subsCreated > avgStats.avgCreated
        ? '▲'
        : stats.subsCreated < avgStats.avgCreated
          ? '▼'
          : '→';
    const canceledTrend =
      stats.subsCanceled > avgStats.avgCanceled
        ? '▲'
        : stats.subsCanceled < avgStats.avgCanceled
          ? '▼'
          : '→';

    return `Plan: "${planName}"
Date: ${dateStr}

created:    ${stats.subsCreated} ${createdTrend}
renewed:    ${stats.subsRenewed}
canceled:   ${stats.subsCanceled} ${canceledTrend}
expired:    ${stats.subsExpired}

7-day avg created: ${avgStats.avgCreated}
7-day avg canceled: ${avgStats.avgCanceled}

Goal: improve subscription growth and retention.
Return only the numbered list.`;
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

    const avgStats = await this.getPreviousWeekAverage(categoryId, date);

    const dateStr = date.toISOString().split('T')[0];
    const prompt = this.makeCategoryPrompt(
      stats.categoryName,
      dateStr,
      stats,
      avgStats,
    );

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1';
    const res = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT_CATEGORY },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
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

    const avgStats = await this.getPlanPreviousWeekAverage(planId, date);

    const dateStr = date.toISOString().split('T')[0];
    const prompt = this.makePlanPrompt(plan.name, dateStr, stats, avgStats);

    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
    const res = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT_PLAN },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
    });

    return res.choices[0].message.content.trim();
  }
}
