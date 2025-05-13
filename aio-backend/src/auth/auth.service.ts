import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bull';
import { CookieOptions, Response } from 'express';
import ms from 'ms';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';
import { v4 as uuid } from 'uuid';
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdatePasswordDto,
} from './dto';
import { JwtPayload, Role, Tokens } from './types';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';
import { promisify } from 'util';
import Stripe from 'stripe';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Credentials, OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import axios from 'axios';
import { StorageService } from '../storage/storage.service';

const scrypt = promisify(crypto.scrypt);

@Injectable()
export class AuthService {
  private readonly cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  };

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private config: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private prismaService: PrismaService,
    private storage: StorageService,
    @InjectQueue('recovery-queue') private recoveryQueue: Queue,
    @InjectQueue('confirmation-queue') private confirmationQueue: Queue,
    private redisService: RedisService,
    @Inject('StripeClient') private stripeClient: Stripe,
  ) {}

  createOAuth2GoogleClient(): OAuth2Client {
    return new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      this.config.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  generateGoogleAuthUrl(clientType: string): string {
    const oauth2Client = this.createOAuth2GoogleClient();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    return oauth2Client.generateAuthUrl({
      scope: scopes,
      state: clientType,
    });
  }

  async getGoogleUserTokens(code: string) {
    const oauth2Client = this.createOAuth2GoogleClient();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  async getUserClient(tokens: Credentials) {
    const oauth2Client = this.createOAuth2GoogleClient();
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  async register(dto: RegisterDto): Promise<Tokens> {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (user) {
      throw new BadRequestException('User with this email already exists');
    }
    let customer = null;
    try {
      customer = await this.stripeClient.customers.create({
        name: dto.userName,
        email: dto.email,
      });
    } catch (error) {
      this.logger.error('Stripe customer cannot be created');
      throw new InternalServerErrorException('Internal server error');
    }
    const { password, ...userData } = dto;
    const hash = await this.hashData(password);
    const newUser = await this.usersService.create({
      ...userData,
      passwordHash: hash,
      customerId: customer.id,
    });
    return this.getTokens(newUser.id, newUser.role as Role);
  }

  async login(dto: LoginDto): Promise<Tokens> {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }
    if (user.passwordHash === 'GOOGLE_USER') {
      throw new ForbiddenException('Use google oauth');
    }
    const passwordMatch = await this.validatePassword(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatch) {
      throw new ForbiddenException('Invalid credentials');
    }
    return this.getTokens(user.id, user.role as Role);
  }

  async logout(userId: number, deviceId: string) {
    await this.redisService.deleteKey(`rt:${userId}:${deviceId}`);
  }

  async refreshToken(
    userId: number,
    rt: string,
    deviceId: string,
    res: Response,
  ) {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      await this.redisService.deleteKey(`rt:${userId}:${deviceId}`);
      this.clearAuthCookies(res);
      throw new ForbiddenException('User with this id does not exist');
    }
    const hashedRt = await this.redisService.getValue(
      `rt:${userId}:${deviceId}`,
    );
    if (!hashedRt) {
      this.clearAuthCookies(res);
      throw new ForbiddenException('Refresh token is not valid');
    }
    const rtMatch = await this.validatePassword(hashedRt, rt);
    if (!rtMatch) {
      throw new ForbiddenException('Refresh token is invalid');
    }
    return this.getTokens(user.id, user.role as Role, deviceId);
  }

  setAuthCookies(res: Response, tokens: Tokens) {
    res.cookie('refreshToken', tokens.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('deviceId', tokens.deviceId, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('refreshToken', this.cookieOptions);
    res.clearCookie('deviceId', this.cookieOptions);
  }

  async updatePassword(dto: UpdatePasswordDto, userId: number, res?: Response) {
    const user = await this.usersService.findUserById(userId);
    const isPasswordValid = await this.validatePassword(
      user.passwordHash,
      dto.oldPassword,
    );
    if (!isPasswordValid) {
      throw new ForbiddenException('Old password is invalid');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password should be different');
    }
    await this.changePassword(userId, dto.newPassword);

    const tokens = await this.getTokens(userId, user.role as Role);
    if (res) {
      this.setAuthCookies(res, tokens);
    }
  }

  async googleOauthCallback(code: string) {
    const googleTokens = await this.getGoogleUserTokens(code);
    const client = await this.getUserClient(googleTokens);
    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();
    const { email, name, picture } = data;

    const user = await this.usersService.findUserByEmail(email);
    let userId: number;
    if (user) {
      if (user.passwordHash !== 'GOOGLE_USER') {
        throw new ForbiddenException('Login with password is required');
      }
      userId = user.id;
    } else {
      let customer = null;
      try {
        customer = await this.stripeClient.customers.create({
          name: name,
          email: email,
        });
      } catch (error) {
        this.logger.error('Stripe customer cannot be created');
        throw new InternalServerErrorException('Internal server error');
      }

      const newUser = await this.usersService.create({
        email,
        userName: name,
        isEmailConfirmed: true,
        passwordHash: 'GOOGLE_USER',
        customerId: customer.id,
      });

      if (picture) {
        try {
          const resp = await axios.get(picture, {
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(resp.data, 'binary');
          const contentType = resp.headers['content-type'] || 'image/jpeg';

          const fileExt = picture.split('.').pop()!.split('?')[0] || 'jpg';
          const fakeFile = {
            originalname: `google-avatar.${fileExt}`,
            mimetype: contentType,
            size: buffer.length,
            buffer,
          } as Express.Multer.File;

          newUser.avatarUrl = await this.usersService.setAvatar(
            newUser.id,
            fakeFile,
          );
        } catch (err) {
          this.logger.error('Could not import Google avatar', err);
        }
      }

      userId = newUser.id;
    }

    return await this.getTokens(userId, Role.User);
  }

  async requestRecovery(email: string) {
    const user = await this.usersService.findUserByEmail(email);
    if (!user) {
      throw new ForbiddenException('User with this email does not exist');
    }
    const job = await this.recoveryQueue.add({ email }, { removeOnFail: true });
    await job.finished();
    const token = uuid();
    await this.redisService.setKey(token, email, ms('15m'));
    await this.mailService.sendPasswordRecoveryEmail(email, token);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;
    const email = await this.redisService.getValue(token);
    if (!email) {
      throw new NotFoundException('Time is up. Please try again');
    }
    const user = await this.usersService.findUserByEmail(email);
    await this.changePassword(user.id, newPassword);
    await this.redisService.deleteKey(token);
  }

  async requestEmailConfirmation(userId: number) {
    const user = await this.usersService.findUserById(userId);
    if (user.isEmailConfirmed) {
      throw new BadRequestException('Email is confirmed');
    }
    const job = await this.recoveryQueue.add({ userId });
    await job.finished();
    const token = this.generateShortToken();
    const key = `${userId}-confirmation-token`;
    await this.redisService.setKey(key, token, ms('15m'));
    await this.mailService.sendConfirmationEmail(user.email, token);
  }

  async confirmEmail(userId: number, dto: ConfirmEmailDto) {
    const token: string | null = await this.redisService.getValue(
      `${userId}-confirmation-token`,
    );
    if (!token) {
      throw new BadRequestException('Invalid confirmation code');
    }
    if (dto.code !== token) {
      throw new BadRequestException('Invalid confirmation code');
    }
    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailConfirmed: true,
      },
    });
  }

  private async changePassword(userId: number, newPassword: string) {
    await this.redisService.deleteSubset(`rt:${userId}:*`);
    const hash = await this.hashData(newPassword);
    await this.usersService.updatePassword(userId, hash);
  }

  private async updateRtHash(userId: number, rt: string, deviceId: string) {
    const rtHash = await this.hashData(rt);
    await this.redisService.setKey(
      `rt:${userId}:${deviceId}`,
      rtHash,
      ms('7d'),
    );
  }

  private async getTokens(
    userId: number,
    role: Role,
    deviceId?: string | undefined,
  ): Promise<Tokens> {
    const payload: JwtPayload = { sub: userId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('AT_SECRET'),
        expiresIn: '10m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('RT_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    deviceId = deviceId || uuid();

    await this.updateRtHash(userId, refreshToken, deviceId);

    return { accessToken, refreshToken, deviceId };
  }

  private async hashData(data: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(data, salt, 64)) as Buffer;
    return hash.toString('hex') + ';salt=' + salt;
  }

  async deleteUser(userId: number) {
    // add deleting stripe customers
    await this.usersService.remove(userId);
    await this.redisService.deleteSubset(`rt:${userId}:*`);
  }

  private async validatePassword(passwordHash: string, password: string) {
    const [storedHash, salt] = passwordHash.split(';salt=');
    const hash = (await scrypt(password, salt, 64)) as Buffer;
    return storedHash == hash.toString('hex');
  }

  private generateShortToken(length = 6) {
    const chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const bytes = crypto.randomBytes(length);
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }
}
