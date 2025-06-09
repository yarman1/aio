import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { subDays } from 'date-fns';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async aggregateDaily() {
    const prisma = this.prisma;
    const yesterday = subDays(new Date(), 1);

    const dayStart = new Date(
      Date.UTC(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const dayEnd = new Date(
      Date.UTC(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
        999,
      ),
    );

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
              createdAt: { gte: dayStart, lt: dayEnd },
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
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'RENEWED',
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'CANCELED',
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          prisma.subscriptionEvent.count({
            where: {
              subscription: { planId },
              type: 'EXPIRED',
              createdAt: { gte: dayStart, lt: dayEnd },
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

    this.logger.log(`Aggregated stats for ${yesterday.toDateString()}`);
  }
}
