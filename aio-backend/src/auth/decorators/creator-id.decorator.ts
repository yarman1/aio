import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CreatorId = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user) return request.user;
  },
);
