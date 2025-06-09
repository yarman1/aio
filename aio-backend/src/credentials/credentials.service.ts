import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const HMAC_ALGORITHM = 'sha256';
const TIMESTAMP_WINDOW_SECONDS = 5 * 60;

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCredential(
    creatorId: number,
  ): Promise<{ clientId: string; clientSecret: string }> {
    const plainSecret = crypto.randomBytes(32).toString('hex');

    const saltRounds = 10;
    const hashedSecret = await bcrypt.hash(plainSecret, saltRounds);

    const created = await this.prisma.creatorApiCredential.create({
      data: {
        creatorId,
        clientSecret: hashedSecret,
      },
    });

    return {
      clientId: created.clientId,
      clientSecret: plainSecret,
    };
  }

  async revokeCredential(creatorId: number, clientId: string): Promise<void> {
    const cred = await this.prisma.creatorApiCredential.findUnique({
      where: { clientId },
    });
    if (!cred || cred.creatorId !== creatorId) {
      throw new UnauthorizedException('Credential not found or not yours');
    }
    await this.prisma.creatorApiCredential.update({
      where: { clientId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  async verifySignature(
    clientId: string,
    providedSignature: string,
    providedTimestamp: string,
    method: string,
    path: string,
    payloadHash: string,
  ): Promise<number> {
    const timestampSec = parseInt(providedTimestamp, 10);
    if (isNaN(timestampSec)) {
      throw new BadRequestException('Invalid timestamp');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > TIMESTAMP_WINDOW_SECONDS) {
      throw new UnauthorizedException('Timestamp outside allowed window');
    }

    const credential = await this.prisma.creatorApiCredential.findUnique({
      where: { clientId },
    });
    if (!credential || !credential.isActive) {
      throw new UnauthorizedException('Invalid clientId or revoked');
    }

    const signingString = `${providedTimestamp}|${method.toUpperCase()}|${path}|${payloadHash}`;

    const hmac = crypto.createHmac(HMAC_ALGORITHM, credential.clientSecret);
    hmac.update(signingString);
    const expectedSignature = hmac.digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex'),
      )
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    return credential.creatorId;
  }

  hashPayload(payload: string | Buffer): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
