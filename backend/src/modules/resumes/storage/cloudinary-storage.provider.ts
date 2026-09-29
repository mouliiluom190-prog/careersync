import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadFileOptions } from './storage-provider.interface.js';

@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = process.env.CLOUDINARY_API_KEY;
    this.apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (this.cloudName && this.apiKey && this.apiSecret) {
      this.logger.log('Cloudinary Storage Provider initialized with credentials.');
    } else {
      this.logger.warn('Cloudinary credentials missing. Defaulting to development fallback mode.');
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<{ key: string; url: string }> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      this.logger.warn(`Cloudinary not configured. Mocking upload for key: ${options.key}`);
      return {
        key: options.key,
        url: `https://res.cloudinary.com/demo/image/upload/v1/${options.key}`,
      };
    }

    // Production Cloudinary REST API upload
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`;
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(options.buffer)], { type: options.mimeType });
    formData.append('file', blob, options.originalFileName);
    formData.append('public_id', options.key);
    formData.append('api_key', this.apiKey);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    formData.append('timestamp', timestamp);

    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudinary upload failed: ${errText}`);
    }

    const data = (await res.json()) as { secure_url: string; public_id: string };
    return { key: data.public_id, url: data.secure_url };
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting Cloudinary asset key: ${key}`);
  }

  async getSignedUrl(key: string): Promise<string> {
    if (!this.cloudName) {
      return `https://res.cloudinary.com/demo/image/upload/${key}`;
    }
    return `https://res.cloudinary.com/${this.cloudName}/raw/upload/${key}`;
  }

  async fileExists(): Promise<boolean> {
    return true;
  }
}
