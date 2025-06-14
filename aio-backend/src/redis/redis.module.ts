import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { getRedisOptions } from './redis.options';

@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    const redisProvider = {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisOptions: RedisOptions = getRedisOptions(configService);
        const redisClient = new Redis(redisOptions);
        redisClient.on('error', (err) => console.error('Redis error: ', err));
        return redisClient;
      },
    };

    return {
      module: RedisModule,
      global: true,
      providers: [redisProvider, RedisService],
      exports: [RedisService, redisProvider],
    };
  }
}
