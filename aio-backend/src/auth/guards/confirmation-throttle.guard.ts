import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ConfirmationThrottleGuard extends ThrottlerGuard {
  protected errorMessage =
    'Too many confirmation requests. Please try again later';
}
