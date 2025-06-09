import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StorageService } from '../storage/storage.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const isEmail = !!(await this.findUserByEmail(createUserDto.email));
    if (isEmail) {
      throw new ForbiddenException('User with this email already exists');
    }
    return this.prismaService.user.create({
      data: createUserDto,
    });
  }

  async findUserByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: number) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  async updatePassword(id: number, passwordHash: string) {
    return this.prismaService.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async exists(id: number) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    return user !== null;
  }

  remove(id: number) {
    return this.prismaService.user.delete({ where: { id } });
  }

  async updateUserInfo(id: number, dto: UpdateUserDto) {
    return this.prismaService.user.update({ where: { id }, data: { ...dto } });
  }

  async isEmailConfirmed(id: number) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    return user.isEmailConfirmed;
  }

  async setAvatar(userId: number, file: Express.Multer.File): Promise<string> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.avatarKey) {
      await this.storage.deleteFile(user.avatarKey, false);
    }

    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `avatars/users/${userId}-${uuid()}.${ext}`;

    const { key: avatarKey, url: avatarUrl } =
      await this.storage.uploadSmallFile({
        key,
        buffer: file.buffer,
        contentType: file.mimetype,
        isPrivate: false,
      });

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        avatarKey,
        avatarUrl,
      },
    });

    return avatarUrl;
  }
}
