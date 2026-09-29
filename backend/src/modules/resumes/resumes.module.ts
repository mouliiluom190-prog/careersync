import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller.js';
import { ResumesService } from './resumes.service.js';
import { StorageService } from './storage/storage.service.js';
import { LocalStorageProvider } from './storage/local-storage.provider.js';
import { CloudinaryStorageProvider } from './storage/cloudinary-storage.provider.js';
import { S3StorageProvider } from './storage/s3-storage.provider.js';

@Module({
  controllers: [ResumesController],
  providers: [
    ResumesService,
    StorageService,
    LocalStorageProvider,
    CloudinaryStorageProvider,
    S3StorageProvider,
  ],
  exports: [ResumesService, StorageService],
})
export class ResumesModule {}
