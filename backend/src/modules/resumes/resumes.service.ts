import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service.js';
import { StorageService } from './storage/storage.service.js';
import { ResumeResponseDto } from './dto/resume-response.dto.js';
import { Role, Resume } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to fetch student profile from authenticated User ID
   */
  private async getStudentProfile(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  /**
   * Helper to fetch recruiter profile from authenticated User ID
   */
  private async getRecruiterProfile(userId: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });
    if (!recruiter) {
      throw new NotFoundException('Recruiter profile not found');
    }
    return recruiter;
  }

  /**
   * Student: Upload a new resume
   */
  async uploadResume(
    userId: string,
    file?: Express.Multer.File,
  ): Promise<ResumeResponseDto> {
    const student = await this.getStudentProfile(userId);

    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('File size must not exceed 5 MB');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !ALLOWED_MIME_TYPES.includes(file.mimetype) ||
      !ALLOWED_EXTENSIONS.includes(ext)
    ) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, DOC, and DOCX files are allowed.',
      );
    }

    const sanitizedFileName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeOriginalName = `${sanitizedFileName}${ext}`;

    const storageKey = `resumes/${student.id}/${uuidv4()}${ext}`;

    // Upload to active storage provider
    await this.storageService.uploadFile({
      key: storageKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFileName: safeOriginalName,
    });

    // Count existing active resumes
    const existingCount = await this.prisma.resume.count({
      where: {
        studentProfileId: student.id,
        isArchived: false,
      },
    });

    // Make default if it's the student's first resume
    const isDefault = existingCount === 0;

    const resume = await this.prisma.resume.create({
      data: {
        studentProfileId: student.id,
        originalFileName: safeOriginalName,
        storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
        isDefault,
      },
    });

    const downloadUrl = await this.storageService.getSignedUrl(resume.storageKey);

    return {
      ...resume,
      downloadUrl,
    };
  }

  /**
   * Student: Get all active resumes owned by current student
   */
  async getStudentResumes(userId: string): Promise<ResumeResponseDto[]> {
    const student = await this.getStudentProfile(userId);

    const resumes = await this.prisma.resume.findMany({
      where: {
        studentProfileId: student.id,
        isArchived: false,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return Promise.all(
      resumes.map(async (r: Resume) => ({
        ...r,
        downloadUrl: await this.storageService.getSignedUrl(r.storageKey),
      })),
    );
  }

  /**
   * Student: Get metadata & signed URL for single owned resume
   */
  async getResumeById(
    userId: string,
    resumeId: string,
  ): Promise<ResumeResponseDto> {
    const student = await this.getStudentProfile(userId);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.studentProfileId !== student.id || resume.isArchived) {
      throw new NotFoundException('Resume not found');
    }

    const downloadUrl = await this.storageService.getSignedUrl(resume.storageKey);

    return {
      ...resume,
      downloadUrl,
    };
  }

  /**
   * Student: Get short-lived signed download/view URL for owned resume
   */
  async getResumeDownloadUrl(
    userId: string,
    resumeId: string,
  ): Promise<{ downloadUrl: string; originalFileName: string }> {
    const student = await this.getStudentProfile(userId);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.studentProfileId !== student.id || resume.isArchived) {
      throw new NotFoundException('Resume not found');
    }

    const downloadUrl = await this.storageService.getSignedUrl(
      resume.storageKey,
      3600,
    );

    return {
      downloadUrl,
      originalFileName: resume.originalFileName,
    };
  }

  /**
   * Student: Set a resume as the default resume
   */
  async setDefaultResume(
    userId: string,
    resumeId: string,
  ): Promise<ResumeResponseDto> {
    const student = await this.getStudentProfile(userId);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.studentProfileId !== student.id || resume.isArchived) {
      throw new NotFoundException('Resume not found');
    }

    await this.prisma.$transaction([
      this.prisma.resume.updateMany({
        where: { studentProfileId: student.id },
        data: { isDefault: false },
      }),
      this.prisma.resume.update({
        where: { id: resumeId },
        data: { isDefault: true },
      }),
    ]);

    const updated = await this.prisma.resume.findUniqueOrThrow({
      where: { id: resumeId },
    });

    const downloadUrl = await this.storageService.getSignedUrl(
      updated.storageKey,
    );

    return {
      ...updated,
      downloadUrl,
    };
  }

  /**
   * Student: Delete or archive a resume
   */
  async deleteResume(userId: string, resumeId: string): Promise<{ message: string }> {
    const student = await this.getStudentProfile(userId);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume || resume.studentProfileId !== student.id || resume.isArchived) {
      throw new NotFoundException('Resume not found');
    }

    // Check if resume is attached to any existing applications
    const applicationCount = await this.prisma.application.count({
      where: { resumeId },
    });

    if (applicationCount > 0) {
      // Archive to preserve historical application records
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          isArchived: true,
          isDefault: false,
        },
      });
    } else {
      // Hard delete file and database record
      await this.storageService.deleteFile(resume.storageKey);
      await this.prisma.resume.delete({
        where: { id: resumeId },
      });
    }

    // If deleted resume was default, set another active resume as default
    if (resume.isDefault) {
      const remaining = await this.prisma.resume.findFirst({
        where: {
          studentProfileId: student.id,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (remaining) {
        await this.prisma.resume.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Resume deleted successfully' };
  }

  /**
   * Authorized Access: Get signed download URL for application's resume
   * Enforces BOLA:
   * - Student who submitted application OR
   * - Recruiter who owns the job for this application
   */
  async getApplicationResumeDownloadUrl(
    userId: string,
    userRole: Role,
    applicationId: string,
  ): Promise<{ downloadUrl: string; originalFileName: string }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        resume: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (userRole === Role.STUDENT) {
      const student = await this.getStudentProfile(userId);
      if (application.studentProfileId !== student.id) {
        throw new ForbiddenException(
          'You are not authorized to view this application resume',
        );
      }
    } else if (userRole === Role.RECRUITER) {
      const recruiter = await this.getRecruiterProfile(userId);
      if (application.job.recruiterId !== recruiter.id) {
        throw new ForbiddenException(
          'You are not authorized to access resumes for jobs owned by another recruiter',
        );
      }
    } else if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('Unauthorized access');
    }

    if (application.resume) {
      const downloadUrl = await this.storageService.getSignedUrl(
        application.resume.storageKey,
        3600,
      );
      return {
        downloadUrl,
        originalFileName: application.resume.originalFileName,
      };
    }

    if (application.resumeUrl) {
      return {
        downloadUrl: application.resumeUrl,
        originalFileName: 'submitted_resume_reference',
      };
    }

    throw new NotFoundException('No resume associated with this application');
  }
}
