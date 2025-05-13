import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtRtPayload } from '../types';

export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user as JwtRtPayload;
  },
);
