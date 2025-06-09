import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { Request } from 'express';

@Injectable()
export class CredentialsGuard implements CanActivate {
  constructor(private readonly credentialsService: CredentialsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    const clientId = req.header('x-client-id');
    const signature = req.header('x-signature');
    const timestamp = req.header('x-timestamp');

    if (!clientId || !signature || !timestamp) {
      throw new UnauthorizedException('Missing credentials headers');
    }

    let payloadBuffer: Buffer;
    if (req.method === 'GET' || !req.body) {
      payloadBuffer = Buffer.from('');
    } else {
      payloadBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));
    }
    const payloadHash = this.credentialsService.hashPayload(payloadBuffer);

    const canonicalPath = req.originalUrl.split('?')[0];

    let verifiedCreatorId: number;
    try {
      verifiedCreatorId = await this.credentialsService.verifySignature(
        clientId,
        signature,
        timestamp,
        req.method,
        canonicalPath,
        payloadHash,
      );
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Invalid signature or credentials');
    }

    (req as any).creatorId = verifiedCreatorId;
    return true;
  }
}
