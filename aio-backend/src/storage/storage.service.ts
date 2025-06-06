import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { URL } from 'url';

@Injectable()
export class StorageService {
  private publicBucketName: string;
  private privateBucketName: string;
  private partSize = 20 * 1024 * 1024;

  constructor(
    configService: ConfigService,
    private readonly s3Client: S3Client,
  ) {
    this.publicBucketName = configService.get<string>('S3_PUBLIC_BUCKET_NAME');
    this.privateBucketName = configService.get<string>(
      'S3_PRIVATE_BUCKET_NAME',
    );
  }

  async uploadSmallFile(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
    isPrivate?: boolean;
  }): Promise<{ key: string; url: string }> {
    const { key, buffer, contentType, isPrivate = false } = params;
    const bucket = isPrivate ? this.privateBucketName : this.publicBucketName;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: isPrivate ? 'private' : 'public-read',
      }),
    );

    const endpoint = await this.s3Client.config.endpoint();
    const baseUrl = `${endpoint.protocol}//${'192.168.0.119'}${endpoint.port ? ':' + endpoint.port : ''}`;

    return {
      key,
      url: `${baseUrl}/${bucket}/${key}`,
    };
  }

  async getPresignedPutUrl(
    key: string,
    contentType: string,
    isPrivate = false,
  ) {
    const bucket = isPrivate ? this.privateBucketName : this.publicBucketName;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: isPrivate ? 'private' : 'public-read',
    });

    const rawUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    const parsedUrl = new URL(rawUrl);
    parsedUrl.hostname = '192.168.0.119';
    parsedUrl.port = '9000';

    const customUrl = parsedUrl.toString();

    return { key, url: customUrl };
  }

  async deleteFile(key: string, isPrivate = false): Promise<void> {
    const bucket = isPrivate ? this.privateBucketName : this.publicBucketName;
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.privateBucketName,
      Key: key,
    });

    const rawUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    const parsedUrl = new URL(rawUrl);
    parsedUrl.hostname = '192.168.0.119';
    parsedUrl.port = '9000';

    return parsedUrl.toString();
  }
}
