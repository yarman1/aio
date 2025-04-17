import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { Observable } from 'rxjs';
import { JwtPayload } from '../types';

@Injectable()
export class ConfirmationFlagInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    const isTimeout = await this.redisService.getValue(
      `confirmation-flag:${user.sub}`,
    );
    if (isTimeout) {
      throw new HttpException(
        'Too many requests. Try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
