import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ResumesService } from './resumes.service.js';
import { StorageService } from './storage/storage.service.js';
import { Role } from '@prisma/client';

@Controller('resumes')
export class ResumesController {
  constructor(
    private readonly resumesService: ResumesService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Student: Upload a resume
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    }),
  )
  async uploadResume(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file to upload');
    }
    return this.resumesService.uploadResume(userId, file);
  }

  /**
   * Student: Get all my resumes
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentResumes(@CurrentUser('id') userId: string) {
    return this.resumesService.getStudentResumes(userId);
  }

  /**
   * Authorized Access: Get download URL for an application's resume
   * (Used by Recruiters reviewing applicants or Students reviewing applications)
   */
  @Get('application/:applicationId/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.RECRUITER, Role.ADMIN)
  async getApplicationResumeDownloadUrl(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('applicationId') applicationId: string,
  ) {
    return this.resumesService.getApplicationResumeDownloadUrl(
      userId,
      role,
      applicationId,
    );
  }

  /**
   * Student: Get metadata for single resume
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getResumeById(
    @CurrentUser('id') userId: string,
    @Param('id') resumeId: string,
  ) {
    return this.resumesService.getResumeById(userId, resumeId);
  }

  /**
   * Student: Get signed download URL for owned resume
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getResumeDownloadUrl(
    @CurrentUser('id') userId: string,
    @Param('id') resumeId: string,
  ) {
    return this.resumesService.getResumeDownloadUrl(userId, resumeId);
  }

  /**
   * Student: Set default resume
   */
  @Patch(':id/default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async setDefaultResume(
    @CurrentUser('id') userId: string,
    @Param('id') resumeId: string,
  ) {
    return this.resumesService.setDefaultResume(userId, resumeId);
  }

  /**
   * Student: Delete resume
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async deleteResume(
    @CurrentUser('id') userId: string,
    @Param('id') resumeId: string,
  ) {
    return this.resumesService.deleteResume(userId, resumeId);
  }

  /**
   * Secure Proxy Stream Route for Local Storage Provider
   * Validates signed HMAC token signature before streaming file
   */
  @Get('file-stream/*key')
  async streamLocalFile(
    @Param('key') rawKey: string,
    @Query('expires') expiresStr: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ) {
    const key = decodeURIComponent(rawKey);
    const expires = parseInt(expiresStr, 10);

    if (!expires || !signature) {
      throw new ForbiddenException('Missing storage signature or expiration');
    }

    const localProvider = this.storageService.getLocalStorageProvider();
    const isValid = localProvider.verifySignature(key, expires, signature);

    if (!isValid) {
      throw new ForbiddenException('Invalid or expired download signature');
    }

    const filePath = localProvider.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested file does not exist');
    }

    res.sendFile(filePath);
  }
}
