import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'multer';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ResumesService } from '../src/modules/resumes/resumes.service.js';
import { StorageService } from '../src/modules/resumes/storage/storage.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { Role } from '@prisma/client';

describe('ResumesService & Security Guardrails', () => {
  let resumesService: ResumesService;
  let prismaMock: any;
  let storageServiceMock: any;

  const studentUser = { id: 'user-student-1', role: Role.STUDENT };
  const otherStudentUser = { id: 'user-student-2', role: Role.STUDENT };
  const recruiterUser = { id: 'user-recruiter-1', role: Role.RECRUITER };
  const otherRecruiterUser = { id: 'user-recruiter-2', role: Role.RECRUITER };

  const studentProfile = { id: 'student-prof-1', userId: studentUser.id };
  const otherStudentProfile = { id: 'student-prof-2', userId: otherStudentUser.id };
  const recruiterProfile = { id: 'recruiter-prof-1', userId: recruiterUser.id };
  const otherRecruiterProfile = { id: 'recruiter-prof-2', userId: otherRecruiterUser.id };

  const mockResume = {
    id: 'resume-1',
    studentProfileId: studentProfile.id,
    originalFileName: 'software_engineer.pdf',
    storageKey: 'resumes/student-prof-1/uuid123.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 500, // 500 KB
    isDefault: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherResume = {
    id: 'resume-2',
    studentProfileId: otherStudentProfile.id,
    originalFileName: 'other_student_resume.pdf',
    storageKey: 'resumes/student-prof-2/uuid456.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 600,
    isDefault: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      studentProfile: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.userId === studentUser.id) return Promise.resolve(studentProfile);
          if (where.userId === otherStudentUser.id) return Promise.resolve(otherStudentProfile);
          return Promise.resolve(null);
        }),
      },
      recruiterProfile: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.userId === recruiterUser.id) return Promise.resolve(recruiterProfile);
          if (where.userId === otherRecruiterUser.id) return Promise.resolve(otherRecruiterProfile);
          return Promise.resolve(null);
        }),
      },
      resume: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...mockResume,
            ...data,
          }),
        ),
        findMany: vi.fn().mockResolvedValue([mockResume]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === mockResume.id) return Promise.resolve(mockResume);
          if (where.id === mockOtherResume.id) return Promise.resolve(mockOtherResume);
          return Promise.resolve(null);
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(mockResume),
        update: vi.fn().mockResolvedValue({ ...mockResume, isDefault: true }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn().mockResolvedValue(mockResume),
      },
      application: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'app-1') {
            return Promise.resolve({
              id: 'app-1',
              studentProfileId: studentProfile.id,
              job: { id: 'job-1', recruiterId: recruiterProfile.id },
              resume: mockResume,
            });
          }
          return Promise.resolve(null);
        }),
      },
      $transaction: vi.fn().mockImplementation((cbOrArray) => {
        if (Array.isArray(cbOrArray)) return Promise.resolve(cbOrArray);
        if (typeof cbOrArray === 'function') return cbOrArray(prismaMock);
      }),
    };

    storageServiceMock = {
      uploadFile: vi.fn().mockResolvedValue({
        key: 'resumes/student-prof-1/uuid123.pdf',
        url: '/api/resumes/file-stream/test-key',
      }),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      getSignedUrl: vi
        .fn()
        .mockResolvedValue('/api/resumes/file-stream/signed-test-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageServiceMock },
      ],
    }).compile();

    resumesService = module.get<ResumesService>(ResumesService);
  });

  describe('Upload Resume Security & Validation', () => {
    it('should upload a valid PDF resume successfully', async () => {
      const mockFile = {
        originalname: 'my_resume.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 300,
        buffer: Buffer.from('PDF content'),
      } as Express.Multer.File;

      const result = await resumesService.uploadResume(studentUser.id, mockFile);

      expect(result).toBeDefined();
      expect(result.originalFileName).toBe('my_resume.pdf');
      expect(storageServiceMock.uploadFile).toHaveBeenCalled();
    });

    it('should upload a valid DOCX resume successfully', async () => {
      const mockFile = {
        originalname: 'my_resume.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024 * 400,
        buffer: Buffer.from('DOCX content'),
      } as Express.Multer.File;

      const result = await resumesService.uploadResume(studentUser.id, mockFile);

      expect(result).toBeDefined();
      expect(result.originalFileName).toBe('my_resume.docx');
    });

    it('should reject invalid file extensions like .exe', async () => {
      const mockFile = {
        originalname: 'script.exe',
        mimetype: 'application/octet-stream',
        size: 1024 * 10,
        buffer: Buffer.from('malicious binary'),
      } as Express.Multer.File;

      await expect(
        resumesService.uploadResume(studentUser.id, mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding maximum size of 5 MB', async () => {
      const mockFile = {
        originalname: 'heavy_resume.pdf',
        mimetype: 'application/pdf',
        size: 6 * 1024 * 1024, // 6 MB
        buffer: Buffer.alloc(6 * 1024 * 1024),
      } as Express.Multer.File;

      await expect(
        resumesService.uploadResume(studentUser.id, mockFile),
      ).rejects.toThrow(PayloadTooLargeException);
    });
  });

  describe('Resume Ownership & Access Controls', () => {
    it('should allow student to list their own resumes', async () => {
      const list = await resumesService.getStudentResumes(studentUser.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(mockResume.id);
    });

    it("should prevent a student from accessing another student's resume", async () => {
      await expect(
        resumesService.getResumeById(studentUser.id, mockOtherResume.id),
      ).rejects.toThrow(NotFoundException);
    });

    it("should prevent a student from deleting another student's resume", async () => {
      await expect(
        resumesService.deleteResume(studentUser.id, mockOtherResume.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow student to set their own default resume', async () => {
      const updated = await resumesService.setDefaultResume(
        studentUser.id,
        mockResume.id,
      );
      expect(updated.isDefault).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('Recruiter Application Resume Access & BOLA Checks', () => {
    it('should allow recruiter owning the job to access candidate signed resume URL', async () => {
      const res = await resumesService.getApplicationResumeDownloadUrl(
        recruiterUser.id,
        Role.RECRUITER,
        'app-1',
      );
      expect(res.downloadUrl).toBeDefined();
      expect(res.originalFileName).toBe('software_engineer.pdf');
    });

    it('should block recruiter not owning the job with 403 Forbidden', async () => {
      await expect(
        resumesService.getApplicationResumeDownloadUrl(
          otherRecruiterUser.id,
          Role.RECRUITER,
          'app-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should block student from accessing another applicant's resume URL with 403 Forbidden", async () => {
      await expect(
        resumesService.getApplicationResumeDownloadUrl(
          otherStudentUser.id,
          Role.STUDENT,
          'app-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
