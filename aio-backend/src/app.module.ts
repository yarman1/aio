import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { AtGuard, RolesGuard } from './auth/guards';
import { PaymentModule } from './payment/payment.module';
import { CreatorsModule } from './creators/creators.module';
import { ClientTypeGuard } from './guards/client-type.guard';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PostsModule } from './posts/posts.module';
import { StorageModule } from './storage/storage.module';
import { StatsModule } from './stats/stats.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { CredentialsModule } from './credentials/credentials.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    UsersModule,
    MailModule,
    RedisModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: ['REDIS_CLIENT'],
      useFactory: (redisClient: Redis) => ({
        throttlers: [
          { name: 'short', ttl: 60, limit: 10 },
          { name: 'medium', ttl: 60, limit: 10 },
        ],
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
    PaymentModule,
    CreatorsModule,
    PlansModule,
    SubscriptionsModule,
    PostsModule,
    StorageModule,
    StatsModule,
    RecommendationsModule,
    CredentialsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientTypeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
