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
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import {
  UpdatePostDto,
  SearchPostsDto,
  VotePollDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto';
import { User } from '../auth/decorators';
import { GetCreatorIdPipe } from '../auth/pipes/get-creator-id.pipe';
import { CreatePostDto } from './dto/create-post.dto';
import { SetPollOptionsDto } from './dto/set-poll-options.dto';
import { PlayMediaDto } from './dto/play-media.dto';
import { Response } from 'express';
import { JwtRtPayload } from '../auth/types';
import { SearchPostsUsersDto } from './dto/search-posts-users.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Body() dto: CreatePostDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.createPost(creatorId, dto));
  }

  @Put(':id')
  async updatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.updatePost(creatorId, id, dto));
  }

  @Put(':id/activate')
  async activatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.activatePost(creatorId, id));
  }

  @Put(':id/deactivate')
  async deactivatePost(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.deactivatePost(creatorId, id));
  }

  @Get(':id/authenticated')
  async getPostAuthenticated(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { sub: number },
    @Res() res: Response,
  ) {
    res.send(await this.postsService.getPostById(id, user.sub));
  }

  @Post(':id/header')
  @UseInterceptors(FileInterceptor('file'))
  async uploadHeaderImage(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.uploadPostHeaderImage(creatorId, id, file),
    );
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPostImage(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('order', ParseIntPipe) order: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.uploadPostImage(creatorId, id, file, order),
    );
  }

  @Delete(':postId/images/:imageId')
  async deletePostImage(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.deletePostImage(creatorId, postId, imageId),
    );
  }

  @Post(':id/media/initiate')
  async initiateMediaUpload(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('contentType') contentType: string,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.initiateMediaUpload(creatorId, id, contentType),
    );
  }

  @Post(':id/media/confirm')
  async confirmMediaUpload(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('contentType') contentType: string,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.confirmMediaUpload(creatorId, id, contentType),
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
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.uploadMediaPreview(creatorId, id, file));
  }

  @Get(':id/media/refresh')
  async refreshMediaUrls(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { sub: number },
    @Res() res: Response,
  ) {
    const media = await this.postsService.refreshMediaUrls(id, user.sub);
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    res.send(media);
  }

  @Post('like/:postId')
  async likePost(
    @User() user: { sub: number },
    @Param('postId', ParseIntPipe) postId: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.likePost(user.sub, postId));
  }

  @Delete('like/:postId')
  async unlikePost(
    @User() user: { sub: number },
    @Param('postId', ParseIntPipe) postId: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.unlikePost(user.sub, postId));
  }

  @Post('repost/:postId')
  async repostPost(
    @User() user: { sub: number },
    @Param('postId', ParseIntPipe) postId: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.repostPost(user.sub, postId));
  }

  @Post('poll/vote')
  async votePoll(
    @User() user: { sub: number },
    @Body() dto: VotePollDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.votePoll(user.sub, dto));
  }

  @Post('comments/:id')
  async createComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.createComment(user.sub, createCommentDto, postId),
    );
  }

  @Put('comments/:id')
  async updateComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.updateComment(
        user.sub,
        commentId,
        updateCommentDto,
      ),
    );
  }

  @Delete('comments/:id')
  async deleteComment(
    @User() user: { sub: number },
    @Param('id', ParseIntPipe) commentId: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.deleteComment(user.sub, commentId));
  }

  @Get('user/search-posts')
  async searchAuthenticated(
    @User() user: JwtRtPayload,
    @Query() dto: SearchPostsUsersDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.searchPosts(user.sub, dto));
  }

  @Get('creator/search-posts')
  async searchCreatorPosts(
    @User(GetCreatorIdPipe) creatorId: number,
    @Query() dto: SearchPostsDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.searchCreatorPosts(creatorId, dto));
  }

  @Get('creator/:id')
  async getPostByCreator(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.getPostByCreator(creatorId, id));
  }

  @Post(':id/poll/options')
  async setPollOptions(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: SetPollOptionsDto,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.setPollOptions(creatorId, postId, dto));
  }

  @Put(':id/poll/close')
  async closePoll(
    @User(GetCreatorIdPipe) creatorId: number,
    @Param('id', ParseIntPipe) postId: number,
    @Res() res: Response,
  ) {
    res.send(await this.postsService.closePoll(creatorId, postId));
  }

  @Post(':postId/play')
  async recordPlay(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: PlayMediaDto,
    @User() user: { sub: number },
    @Res() res: Response,
  ) {
    res.send(
      await this.postsService.recordMediaPlay(user.sub, postId, dto.duration),
    );
  }
}
