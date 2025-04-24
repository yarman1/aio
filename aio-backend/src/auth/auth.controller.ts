import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import ms from 'ms';
import { AuthService } from './auth.service';
import { Public, User } from './decorators';
import {
  AtResponseDto,
  LoginDto,
  PasswordRecoveryDto,
  RegisterDto,
  ResetPasswordDto,
  UpdatePasswordDto,
} from './dto';
import { RecoveryThrottlerGuard, RtGuard } from './guards';
import { BlockCheckInterceptor } from './interceptors/block-check.interceptor';
import { JwtRtPayload } from './types';
import { ConfirmationFlagInterceptor } from './interceptors/confirmation-flag.interceptor';
import { ConfirmationThrottleGuard } from './guards/confirmation-throttle.guard';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { TokenResponseMobileDto } from './dto/mobile/token-response.mobile.dto';
import { plainToInstance } from 'class-transformer';
import { GoogleAuthUrlDto } from './dto/google-auth-url.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('local/sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ type: AtResponseDto })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const tokens = await this.authService.login(dto);
    this.authService.setAuthCookies(res, tokens);
    return plainToInstance(AtResponseDto, { accessToken: tokens.accessToken });
  }

  @Public()
  @Post('local/mobile/sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ type: AtResponseDto })
  async loginMobile(@Body() dto: LoginDto) {
    const tokens: TokenResponseMobileDto = await this.authService.login(dto);
    return plainToInstance(TokenResponseMobileDto, tokens);
  }

  @Public()
  @Post('local/sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ type: AtResponseDto })
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const tokens = await this.authService.register(dto);
    this.authService.setAuthCookies(res, tokens);
    return plainToInstance(AtResponseDto, { accessToken: tokens.accessToken });
  }

  @Public()
  @Get('/google/auth/url')
  async getGoogleAuthUrl(@Req() req: Request): Promise<GoogleAuthUrlDto> {
    // revise errors
    if (!req?.headers?.['x-client-type']) {
      throw new BadRequestException('Client type is not defined');
    }
    if (
      req.headers['x-client-type'] !== 'web' ||
      req.headers['x-client-type'] !== 'mobile'
    ) {
      throw new BadRequestException('Client type is not defined');
    }
    const clientType = req.headers['x-client-type'];
    const url = this.authService.generateGoogleAuthUrl(clientType);
    const res = {
      authUrl: url,
    };
    return plainToInstance(GoogleAuthUrlDto, res);
  }

  @Public()
  @Get('/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') clientType: string,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.googleOauthCallback(code);

    if (clientType === 'web') {
      this.authService.setAuthCookies(res, tokens);
      res.redirect(this.config.get<string>('GOOGLE_OAUTH_REDIRECT_WEB'));
    } else {
      const redirectBase = this.config.get<string>(
        'GOOGLE_OAUTH_REDIRECT_MOBILE',
      );
      res.redirect(
        `${redirectBase}?access=${tokens.accessToken}&refresh=${tokens.refreshToken}&device=${tokens.deviceId}`,
      );
    }
  }

  @Public()
  @Post('local/mobile/sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ type: AtResponseDto })
  async registerMobile(@Body() dto: RegisterDto) {
    const tokens = await this.authService.register(dto);
    return plainToInstance(TokenResponseMobileDto, tokens);
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @User() user: JwtRtPayload,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (req?.headers?.['x-client-type'] === 'web') {
      this.authService.clearAuthCookies(res);
    }
    await this.authService.logout(user.sub, user.deviceId);
    res.send();
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ type: AtResponseDto })
  async refreshToken(
    @User() user: JwtRtPayload,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const tokens = await this.authService.refreshToken(
      user.sub,
      user.refreshToken,
      user.deviceId,
      res,
    );
    if (req?.headers?.['x-client-type'] === 'web') {
      this.authService.setAuthCookies(res, tokens);
    }
    res.json({ accessToken: tokens.accessToken });
  }

  @UseGuards(RtGuard)
  @Put('password')
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Old password is invalid',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'New password should be different from old',
  })
  async updatePassword(
    @Body() dto: UpdatePasswordDto,
    @User('sub') userId: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const isWebRequest = req.headers?.['x-client-type'] === 'web';
    if (isWebRequest) {
      await this.authService.updatePassword(dto, userId, res);
    } else {
      await this.authService.updatePassword(dto, userId);
    }

    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Public()
  @UseInterceptors(BlockCheckInterceptor)
  @UseGuards(RecoveryThrottlerGuard)
  @Throttle({
    short: { limit: 1, ttl: ms('15m') },
    medium: { limit: 5, ttl: ms('2h') },
  })
  @Post('recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestRecovery(
    @Body() dto: PasswordRecoveryDto,
    @Res() res: Response,
  ) {
    try {
      await this.authService.requestRecovery(dto.email);
      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).send();
    }
  }

  @UseInterceptors(ConfirmationFlagInterceptor)
  @UseGuards(ConfirmationThrottleGuard)
  @Post('email-confirmation/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestConfirmationEmail(
    @User() user: JwtRtPayload,
    @Res() res: Response,
  ) {
    await this.authService.requestEmailConfirmation(user.sub);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Put('confirm-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @User() user: JwtRtPayload,
    @Body() dto: ConfirmEmailDto,
    @Res() res: Response,
  ) {
    await this.authService.confirmEmail(user.sub, dto);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Public()
  @Put('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  // update delete user (stripe things and maybe deactivation)
  @UseGuards(RtGuard)
  @Delete('user')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@User() user: JwtRtPayload, @Res() res: Response) {
    this.authService.clearAuthCookies(res);
    await this.authService.deleteUser(user.sub);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
