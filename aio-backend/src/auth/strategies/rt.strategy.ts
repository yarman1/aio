import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { JwtPayload } from '../types';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        if (req.headers['x-client-type'] === 'web') {
          return req?.cookies?.['refreshToken'] || null;
        } else if (req.headers['x-client-type'] === 'mobile') {
          return req.headers['x-refresh-token'];
        } else {
          return null;
        }
      },
      secretOrKey: config.get<string>('RT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    let refreshToken: string;
    if (req.headers['x-client-type'] === 'web') {
      refreshToken = req?.cookies?.['refreshToken'];
    } else if (req.headers['x-client-type'] === 'mobile') {
      refreshToken = req.headers['x-refresh-token'] as string;
    }

    const isExists = await this.usersService.exists(payload.sub);
    if (!isExists) {
      throw new NotFoundException('User with this id no longer exists');
    }

    let deviceId: string = '';
    if (req.headers['x-client-type'] === 'web') {
      deviceId = req.cookies?.['deviceId'];
    } else if (req.headers['x-client-type'] === 'mobile') {
      deviceId = req.headers['x-device-id'] as string;
    } else {
      throw new ForbiddenException('Device id is not valid');
    }

    if (!deviceId) {
      throw new ForbiddenException('Device id is not valid');
    }
    return {
      ...payload,
      refreshToken,
      deviceId,
    };
  }
}
