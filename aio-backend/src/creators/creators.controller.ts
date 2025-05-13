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
  Post,
  Put,
  Query,
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
import { ReadPublicCreatorDto } from './dto/read-public-creator.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { IsOwnerDto } from './dto/is-owner.dto';
import { SearchCreatorsDto } from './dto/search-creators.dto';

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
    return { isOwner };
  }

  @Public()
  @Get('public/:userName')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'This creator does not exist',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ReadCreatorDto })
  async readPublicCreator(@Param() dto: CreatorUsernameDto) {
    const res = this.creatorsService.readCreatorPublic(dto.userName);
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
    return this.creatorsService.followCreator(payload.sub, creatorId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  async unfollowCreator(
    @Param('id', ParseIntPipe) creatorId: number,
    @User() payload: JwtRtPayload,
  ) {
    await this.creatorsService.unfollowCreator(payload.sub, creatorId);
    return { success: true };
  }

  @Get('followed')
  @HttpCode(HttpStatus.OK)
  async getFollowed(@User() payload: JwtRtPayload) {
    const creators = await this.creatorsService.getFollowedCreators(
      payload.sub,
    );
    return creators;
  }

  /** GET /creators/:id/is-followed */
  @Get(':id/is-followed')
  @HttpCode(HttpStatus.OK)
  async isFollowed(
    @Param('id', ParseIntPipe) creatorId: number,
    @User() payload: JwtRtPayload,
  ) {
    const isFollowed = await this.creatorsService.isFollowing(
      payload.sub,
      creatorId,
    );
    return { isFollowed };
  }

  /** Public search: GET /creators/search?name=foo&page=1&limit=10 */
  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCreators(@Query() dto: SearchCreatorsDto) {
    return this.creatorsService.searchCreators(dto);
  }
}
