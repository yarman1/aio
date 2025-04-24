import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { isClientType } from '../types/client.type';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../auth/decorators';

@Injectable()
export class ClientTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const clientType = request.headers['x-client-type'];

    if (!isClientType(clientType)) {
      throw new ForbiddenException('Access denied for this client type');
    }
    return true;
  }
}
