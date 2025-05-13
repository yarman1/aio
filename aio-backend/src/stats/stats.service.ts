import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  // every day at 2:00
  @Cron('0 2 * * *')
  async aggregateDaily() {
    const prisma = this.prisma;
    const targetDate = subDays(new Date(), 1);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const categories = await prisma.creatorCategory.findMany({
      select: { id: true, creatorId: true, name: true },
    });
    for (const { id: categoryId, name: categoryName } of categories) {
      const [views, likes, reposts, comments, votes, plays] = await Promise.all(
        [
          prisma.postView.count({
            where: {
              post: { categoryId },
              viewDate: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.postLike.count({
            where: {
              post: { categoryId },
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.postRepost.count({
            where: {
              post: { categoryId },
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.comment.count({
            where: {
              post: { categoryId },
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.pollVote.count({
            where: {
              poll: { post: { categoryId } },
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.mediaPlay.count({
            where: {
              post: { categoryId },
              playedAt: { gte: dayStart, lt: dayEnd },
            },
          }),
        ],
      );

      await prisma.creatorCategoryStats.upsert({
        where: {
          creatorCategoryId_date: {
            creatorCategoryId: categoryId,
            date: dayStart,
          },
        },
        create: {
          creatorCategoryId: categoryId,
          date: dayStart,
          views,
          likes,
          reposts,
          comments,
          votes,
          plays,
          categoryName,
        },
        update: { views, likes, reposts, comments, votes, plays, categoryName },
      });
    }

    const plans = await prisma.plan.findMany({ select: { id: true } });
    for (const { id: planId } of plans) {
      const [subsCreated, subsRenewed, subsCanceled, subsExpired] =
        await Promise.all([
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'CREATED',
              occurredAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'RENEWED',
              occurredAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'CANCELED',
              occurredAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'EXPIRED',
              occurredAt: { gte: dayStart, lt: dayEnd },
            },
          }),
        ]);

      await prisma.planStats.upsert({
        where: { planId_date: { planId, date: dayStart } },
        create: {
          planId,
          date: dayStart,
          subsCreated,
          subsRenewed,
          subsCanceled,
          subsExpired,
        },
        update: {
          subsCreated,
          subsRenewed,
          subsCanceled,
          subsExpired,
        },
      });
    }

    this.logger.log(`Aggregated stats for ${targetDate.toDateString()}`);
  }

  constructor(private prisma: PrismaService) {}
}
