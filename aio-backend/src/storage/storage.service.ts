import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private publicBucketName: string;
  private privateBucketName: string;
  private partSize = 20 * 1024 * 1024;
  private s3Client: S3Client;

  constructor(configService: ConfigService) {
    this.publicBucketName = configService.get<string>('S3_PUBLIC_BUCKET_NAME');
    this.privateBucketName = configService.get<string>(
      'S3_PRIVATE_BUCKET_NAME',
    );
    this.s3Client = new S3Client({
      region: configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
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

    return {
      key,
      url: `${this.s3Client.config.endpoint}/${bucket}/${key}`,
    };
  }

  async initiateMultipartUpload(
    key: string,
    contentType: string,
    fileSize: number,
    isPrivate: boolean,
  ) {
    const { UploadId } = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: isPrivate ? this.privateBucketName : this.publicBucketName,
        Key: key,
        ContentType: contentType,
      }),
    );

    const totalParts = Math.ceil(fileSize / this.partSize);
    const presignedUrls = await Promise.all(
      Array.from({ length: totalParts }, (_, i) => {
        const partNumber = i + 1;
        const cmd = new UploadPartCommand({
          Bucket: isPrivate ? this.privateBucketName : this.publicBucketName,
          Key: key,
          UploadId,
          PartNumber: partNumber,
        });
        return getSignedUrl(this.s3Client, cmd, { expiresIn: 3600 }).then(
          (url) => ({
            partNumber,
            url,
          }),
        );
      }),
    );

    return { uploadId: UploadId!, key, presignedUrls, partSize: this.partSize };
  }

  async listUploadedParts(uploadId: string, key: string, isPrivate: boolean) {
    const resp = await this.s3Client.send(
      new ListPartsCommand({
        Bucket: isPrivate ? this.privateBucketName : this.publicBucketName,
        Key: key,
        UploadId: uploadId,
      }),
    );
    return (
      resp.Parts?.map((p) => ({
        PartNumber: p.PartNumber!,
        ETag: p.ETag!,
      })) || []
    );
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ PartNumber: number; ETag: string }>,
    isPrivate: boolean,
  ) {
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: isPrivate ? this.privateBucketName : this.publicBucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );
    // return a URL if you like:
    return {
      key,
      url: `${this.s3Client.config.endpoint}/${isPrivate ? this.privateBucketName : this.publicBucketName}/${key}`,
    };
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
      Bucket: this.publicBucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
