export interface UploadFileOptions {
  key: string;
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
}

export interface StorageProvider {
  uploadFile(options: UploadFileOptions): Promise<{ key: string; url: string }>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  fileExists(key: string): Promise<boolean>;
}
