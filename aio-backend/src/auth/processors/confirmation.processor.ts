import { Process, Processor } from '@nestjs/bull';
import { RedisService } from '../../redis/redis.service';
import { Job } from 'bull';
import { EmailConfirmationDto } from '../dto/email-confirmation.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import ms from 'ms';

@Processor('confirmation-queue')
export class ConfirmationQueue {
  constructor(private readonly redisService: RedisService) {}

  @Process()
  async processConfirmationJob(job: Job<EmailConfirmationDto>) {
    const { userId } = job.data;
    const key = `confirmation-flag:${userId}`;
    const flag: string | null = await this.redisService.getValue(key);
    if (!flag) {
      await this.redisService.setKey(key, '1', ms('15m'));
      return;
    }
    throw new HttpException(
      'Too many requests. Try again later',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
