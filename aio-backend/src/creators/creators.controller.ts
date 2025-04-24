import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { ApiResponse } from '@nestjs/swagger';
import { ClientType } from '../auth/decorators/client-type.decorator';
import { ClientTypes } from '../types/client.type';
import { Public, User } from '../auth/decorators';
import { JwtRtPayload } from '../auth/types';
import { CreatorUsernameDto } from './dto/creator-username.dto';
import { plainToInstance } from 'class-transformer';
import { AccountManagementUrlDto } from './dto/account-management-url.dto';
import { ReadCreatorDto } from './dto/read-creator.dto';
import { ReadPublicCreatorDto } from './dto/read-public-creator.dto';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post('link/onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 403,
    description: 'This creator username is already taken',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Email is not confirmed',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: AccountManagementUrlDto })
  async getCreatorStripeOnboardingLink(
    @ClientType() clientType: ClientTypes,
    @User() payload: JwtRtPayload,
    @Body() dto: CreatorUsernameDto,
  ) {
    const res = this.creatorsService.getCreatorStripeOnboardingLink(
      clientType,
      payload.sub,
      dto.userName,
    );
    return plainToInstance(AccountManagementUrlDto, res);
  }

  @Put('link/account/update')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Creator account does not exist for this user',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AccountManagementUrlDto })
  async getCreatorStripeUpdateLink(
    @ClientType() clientType: ClientTypes,
    @User() payload: JwtRtPayload,
  ) {
    const res = await this.creatorsService.getCreatorStripeUpdateLink(
      clientType,
      payload.sub,
    );
    return plainToInstance(AccountManagementUrlDto, res);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Creator account does not exist for this user',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ReadCreatorDto })
  async readCreator(@User() payload: JwtRtPayload) {
    const res = await this.creatorsService.readCreator(payload.sub);
    return plainToInstance(ReadCreatorDto, res);
  }

  @Public()
  @Get('/public/:userName')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'This creator does not exist',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ReadPublicCreatorDto })
  async readPublicCreator(@Param() dto: CreatorUsernameDto) {
    const res = this.creatorsService.readCreatorPublic(dto.userName);
    return plainToInstance(ReadPublicCreatorDto, res);
  }

  @Get('/stripe/dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Creator account is not verified',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AccountManagementUrlDto })
  async getCreatorStripeDashboardUrl(@User() payload: JwtRtPayload) {
    const res = this.creatorsService.getCreatorStripeDashboardUrl(payload.sub);
    return plainToInstance(AccountManagementUrlDto, res);
  }
}
