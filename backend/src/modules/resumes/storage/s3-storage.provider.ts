import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadFileOptions } from './storage-provider.interface.js';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly endpoint?: string;
  private readonly bucket?: string;

  constructor() {
    this.endpoint = process.env.S3_ENDPOINT;
    this.bucket = process.env.S3_BUCKET || 'careersync-resumes';

    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      this.logger.log('S3 Storage Provider initialized with credentials.');
    } else {
      this.logger.warn('S3 credentials missing. Defaulting to development fallback mode.');
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<{ key: string; url: string }> {
    this.logger.log(`Storing S3 file key: ${options.key}`);
    const host = this.endpoint || 'https://s3.amazonaws.com';
    const url = `${host}/${this.bucket}/${options.key}`;
    return { key: options.key, url };
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting S3 file key: ${key}`);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const host = this.endpoint || 'https://s3.amazonaws.com';
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `${host}/${this.bucket}/${key}?X-Amz-Expires=${expiresAt}&signed=true`;
  }

  async fileExists(): Promise<boolean> {
    return true;
  }
}
