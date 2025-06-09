import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Redirect,
  Res,
  UploadedFile,
  UseInterceptors,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { IsOwnerDto } from './dto/is-owner.dto';
import { SearchCreatorsDto } from './dto/search-creators.dto';
import { Response } from 'express';
import { ReadCreatorPublicDto } from './dto/read-creator-public.dto';
import { CreatorDescriptionDto } from './dto/creator-description.dto';

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
      dto.creatorUsername,
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

  @Get(':creatorId/is-owner')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Whether the current user owns this creator account',
    type: IsOwnerDto,
  })
  async isOwner(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @User() payload: JwtRtPayload,
  ): Promise<IsOwnerDto> {
    const isOwner = await this.creatorsService.userOwnsCreator(
      payload.sub,
      creatorId,
    );
    return plainToInstance(IsOwnerDto, { isOwner });
  }

  @Get('public/:creatorId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'This creator does not exist',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ReadCreatorPublicDto })
  async readPublicCreator(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @User() user: JwtRtPayload,
  ) {
    const res = this.creatorsService.readCreatorPublic(creatorId, user.sub);
    return plainToInstance(ReadCreatorPublicDto, res);
  }

  @Patch('/creator-username')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ReadCreatorDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'This creator does not exist',
  })
  async updateCreatorUsername(
    @Body() dto: CreatorUsernameDto,
    @User() user: JwtRtPayload,
  ) {
    const res = await this.creatorsService.updateCreatorUsername(user.sub, dto);
    return plainToInstance(ReadCreatorDto, res);
  }

  @Patch('/description')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ReadCreatorDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'This creator does not exist',
  })
  async updateCreatorDescription(
    @Body() dto: CreatorDescriptionDto,
    @User() user: JwtRtPayload,
  ) {
    const res = await this.creatorsService.updateCreatorDescription(
      user.sub,
      dto,
    );
    return plainToInstance(ReadCreatorDto, res);
  }

  @Get('stripe/dashboard')
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

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async setAvatar(
    @User(GetCreatorIdPipe) creatorId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const avatarUrl = await this.creatorsService.setAvatar(creatorId, file);
    return { avatarUrl };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  async followCreator(
    @Param('id', ParseIntPipe) creatorId: number,
    @User() payload: JwtRtPayload,
  ) {
    const res = await this.creatorsService.followCreator(
      payload.sub,
      creatorId,
    );
    return plainToInstance(ReadCreatorPublicDto, res);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  async unfollowCreator(
    @Param('id', ParseIntPipe) creatorId: number,
    @User() payload: JwtRtPayload,
  ) {
    const res = await this.creatorsService.unfollowCreator(
      payload.sub,
      creatorId,
    );
    return plainToInstance(ReadCreatorPublicDto, res);
  }

  @Get('followed')
  @HttpCode(HttpStatus.OK)
  async getFollowed(@User() payload: JwtRtPayload) {
    const creators = await this.creatorsService.getFollowedCreators(
      payload.sub,
    );
    return plainToInstance(ReadCreatorPublicDto, creators);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCreators(@Query() dto: SearchCreatorsDto, @Res() res: Response) {
    const result = await this.creatorsService.searchCreators(dto);
    res.send(result);
  }

  @Get('is-exist')
  async isExist(@User() payload: JwtRtPayload, @Res() res: Response) {
    const result = await this.creatorsService.userHasCreator(payload.sub);
    return res.send({
      result: result,
    });
  }

  @Public()
  @Get('subscription-mobile/:creatorId')
  handleMobileSubscription(
    @Param('creatorId') creatorId: string,
    @Res() res: Response,
  ) {
    res.redirect(
      `exp://192.168.0.119:8081/--/subscriptions/success/${creatorId}`,
    );
  }

  @Public()
  @Get('return-mobile')
  @Redirect(`exp://192.168.0.119:8081/--/creator/dashboard/return`, 302)
  handleStripeReturning() {
    return;
  }
}
