import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    StorageService,
    {
      provide: S3Client,
      useFactory: (cfg: ConfigService) => {
        return new S3Client({
          region: cfg.get<string>('S3_REGION'),
          endpoint: cfg.get<string>('S3_ENDPOINT'),
          credentials: {
            accessKeyId: cfg.get<string>('S3_ACCESS_KEY_ID'),
            secretAccessKey: cfg.get<string>('S3_SECRET_ACCESS_KEY'),
          },
          forcePathStyle: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
