import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadFileOptions } from './storage-provider.interface.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { CloudinaryStorageProvider } from './cloudinary-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private activeProvider: StorageProvider;
  private readonly providerName: string;

  constructor(
    private readonly localProvider: LocalStorageProvider,
    private readonly cloudinaryProvider: CloudinaryStorageProvider,
    private readonly s3Provider: S3StorageProvider,
  ) {
    this.providerName = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    switch (this.providerName) {
      case 'cloudinary':
        this.activeProvider = this.cloudinaryProvider;
        this.logger.log('Active Storage Provider: Cloudinary');
        break;
      case 's3':
        this.activeProvider = this.s3Provider;
        this.logger.log('Active Storage Provider: AWS S3 / MinIO');
        break;
      case 'local':
      default:
        this.activeProvider = this.localProvider;
        this.logger.log('Active Storage Provider: Local Disk Storage');
        break;
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<{ key: string; url: string }> {
    return this.activeProvider.uploadFile(options);
  }

  async deleteFile(key: string): Promise<void> {
    return this.activeProvider.deleteFile(key);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.activeProvider.getSignedUrl(key, expiresInSeconds);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.activeProvider.fileExists(key);
  }

  getLocalStorageProvider(): LocalStorageProvider {
    return this.localProvider;
  }
}
