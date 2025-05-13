import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseIntPipe,
  NotFoundException,
  Query,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import {
  UpdatePostDto,
  SearchPostsDto,
  LikePostDto,
  RepostPostDto,
  VotePollDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto';
import { User } from '../auth/decorators';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { Public } from '../auth/decorators';
import { CreatePostDto } from './dto/create-post.dto';
import { SetPollOptionsDto } from './dto/set-poll-options.dto';
import { PlayMediaDto } from './dto/play-media.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(creatorId, dto);
  }

  @Put(':id')
  async updatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(creatorId, id, dto);
  }

  @Put(':id/activate')
  async activatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postsService.activatePost(creatorId, id);
  }

  @Put(':id/deactivate')
  async deactivatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postsService.deactivatePost(creatorId, id);
  }

  @Get(':id')
  @Public()
  async getPostPublic(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  @Get(':id/authenticated')
  async getPostAuthenticated(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { sub: number },
  ) {
    return this.postsService.getPostById(id, user.sub);
  }

  @Post(':id/header')
  @UseInterceptors(FileInterceptor('file'))
  async uploadHeaderImage(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.postsService.uploadPostHeaderImage(creatorId, id, file);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPostImage(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('order') order: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.postsService.uploadPostImage(creatorId, id, file, order);
  }

  @Post(':id/media/initiate')
  async initiateMediaUpload(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('contentType') contentType: string,
    @Body('fileSize') fileSize: number,
  ) {
    return this.postsService.initiateMediaUpload(
      creatorId,
      id,
      contentType,
      fileSize,
    );
  }

  @Post(':id/media/complete')
  async completeMediaUpload(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('uploadId') uploadId: string,
    @Body('parts') parts: Array<{ PartNumber: number; ETag: string }>,
  ) {
    return this.postsService.completeMediaUpload(
      creatorId,
      id,
      uploadId,
      parts,
    );
  }

  @Post(':id/media/preview')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMediaPreview(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.postsService.uploadMediaPreview(creatorId, id, file);
  }

  @Get(':id/media/refresh')
  async refreshMediaUrls(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { sub: number },
  ) {
    const media = await this.postsService.refreshMediaUrls(id, user.sub);
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  @Post('like')
  async likePost(@User() user: { sub: number }, @Body() dto: LikePostDto) {
    return this.postsService.likePost(user.sub, dto);
  }

  @Delete('like/:postId')
  async unlikePost(
    @User() user: { sub: number },
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    return this.postsService.unlikePost(user.sub, postId);
  }

  @Post('repost')
  async repostPost(@User() user: { sub: number }, @Body() dto: RepostPostDto) {
    return this.postsService.repostPost(user.sub, dto);
  }

  @Post('poll/vote')
  async votePoll(@User() user: { sub: number }, @Body() dto: VotePollDto) {
    return this.postsService.votePoll(user.sub, dto);
  }

  @Post('comments/:id')
  async createComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.postsService.createComment(user.sub, {
      ...createCommentDto,
      postId,
    });
  }

  @Put('comments/:id')
  async updateComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.postsService.updateComment(
      user.sub,
      commentId,
      updateCommentDto,
    );
  }

  @Delete('comments/:id')
  async deleteComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) commentId: number,
  ) {
    return this.postsService.deleteComment(user.sub, commentId);
  }

  @Get('comments/:id')
  async getPostComments(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.postsService.getPostComments(user.sub, postId);
  }

  @Get('search')
  @Public()
  async searchPublic(@Query() dto: SearchPostsDto) {
    return this.postsService.searchPosts(undefined, dto);
  }

  @Get('search/authenticated')
  async searchAuthenticated(
    @User() user: { sub: number },
    @Query() dto: SearchPostsDto,
  ) {
    return this.postsService.searchPosts(user.sub, dto);
  }

  @Get('creator/search')
  async searchCreatorPosts(
    @User(GetCreatorIdPipe) creatorId: number,
    @Query() dto: SearchPostsDto,
  ) {
    return this.postsService.searchCreatorPosts(creatorId, dto);
  }

  @Get('creator/:id')
  async getPostByCreator(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.postsService.getPostByCreator(creatorId, id);
  }

  @Post(':id/poll/options')
  async setPollOptions(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: SetPollOptionsDto,
  ) {
    return this.postsService.setPollOptions(creatorId, postId, dto);
  }

  @Put(':id/poll/close')
  async closePoll(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.postsService.closePoll(creatorId, postId);
  }

  @Post(':postId/play')
  recordPlay(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: PlayMediaDto,
    @User() user: { sub: number },
  ) {
    return this.postsService.recordMediaPlay(user.sub, postId, dto.duration);
  }
}
