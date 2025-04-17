import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CreatorsService {
  constructor(
    @Inject('StripeClient') private readonly stripeClient: Stripe,
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createCreatorProfile(userId: number) {}
}
