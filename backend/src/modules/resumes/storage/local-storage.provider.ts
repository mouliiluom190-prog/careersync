import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageProvider, UploadFileOptions } from './storage-provider.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;
  private readonly secretKey: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR || 'uploads/resumes');
    this.secretKey = process.env.JWT_ACCESS_SECRET || 'careersync_local_storage_secret_key';

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      this.logger.log(`Created local storage directory: ${this.baseDir}`);
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<{ key: string; url: string }> {
    const filePath = path.join(this.baseDir, options.key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, options.buffer);
    this.logger.log(`Stored file locally: ${options.key}`);

    const signedUrl = await this.getSignedUrl(options.key, 3600);
    return { key: options.key, url: signedUrl };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.logger.log(`Deleted local file: ${key}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const dataToSign = `${key}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    const encodedKey = encodeURIComponent(key);
    return `/api/resumes/file-stream/${encodedKey}?expires=${expiresAt}&signature=${signature}`;
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, key);
    return fs.existsSync(filePath);
  }

  public getFilePath(key: string): string {
    return path.join(this.baseDir, key);
  }

  public verifySignature(key: string, expires: number, signature: string): boolean {
    if (Math.floor(Date.now() / 1000) > expires) {
      return false;
    }
    const dataToSign = `${key}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}
