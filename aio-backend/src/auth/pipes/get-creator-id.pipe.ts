import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtRtPayload } from '../types';

@Injectable()
export class GetCreatorIdPipe implements PipeTransform {
  constructor(private readonly prismaService: PrismaService) {}

  async transform(userPayload: JwtRtPayload) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        userId: userPayload.sub,
      },
      select: {
        id: true,
      },
    });
    if (!creator) {
      throw new NotFoundException('There is no creator account for this user');
    }

    return creator.id;
  }
}
