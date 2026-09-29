import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ApplicationsService } from '../src/modules/applications/applications.service.js';
import { ApplicationStatus, JobStatus } from '@prisma/client';

describe('ApplicationsService (Unit & Security Suite)', () => {
  let service: ApplicationsService;
  let mockPrismaService: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockNotificationsService = {
      createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mockPrismaService = {
      studentProfile: {
        findUnique: vi.fn(),
      },
      recruiterProfile: {
        findUnique: vi.fn(),
      },
      job: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      application: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      applicationStatusHistory: {
        create: vi.fn(),
      },
      resume: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn((cb) => cb(mockPrismaService)),
    };

    service = new ApplicationsService(
      mockPrismaService as any,
      mockNotificationsService as any,
    );
  });

  describe('Student Apply & Duplicate Prevention', () => {
    it('should allow student to apply to an active job', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.ACTIVE,
        applicationDeadline: null,
      });

      mockPrismaService.application.findUnique.mockResolvedValue(null); // No previous app

      mockPrismaService.application.create.mockResolvedValue({
        id: 'app-1',
        studentProfileId: 'stu-1',
        jobId: 'job-1',
        status: ApplicationStatus.APPLIED,
        history: [{ status: ApplicationStatus.APPLIED }],
      });

      const res = await service.applyToJob('user-stu-1', {
        jobId: 'job-1',
        coverLetter: 'I am excited about this software engineer role.',
      });

      expect(res).toBeDefined();
      expect(res.status).toBe(ApplicationStatus.APPLIED);
      expect(mockPrismaService.applicationStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: 'app-1',
            status: ApplicationStatus.APPLIED,
            changedByUserId: 'user-stu-1',
          }),
        }),
      );
    });

    it('should reject duplicate application to same job (409 Conflict)', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.ACTIVE,
      });

      // Existing application found!
      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'existing-app-1',
        studentProfileId: 'stu-1',
        jobId: 'job-1',
      });

      await expect(
        service.applyToJob('user-stu-1', { jobId: 'job-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject application if job is inactive (DRAFT / CLOSED)', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-closed',
        status: JobStatus.CLOSED,
      });

      await expect(
        service.applyToJob('user-stu-1', { jobId: 'job-closed' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject application if deadline has passed', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-expired',
        status: JobStatus.ACTIVE,
        applicationDeadline: pastDate,
      });

      await expect(
        service.applyToJob('user-stu-1', { jobId: 'job-expired' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Student Application Tracking & Withdrawal', () => {
    it('should return student applications with pagination', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.application.findMany.mockResolvedValue([
        { id: 'app-1', status: ApplicationStatus.APPLIED },
      ]);
      mockPrismaService.application.count.mockResolvedValue(1);

      const res = await service.getStudentApplications('user-stu-1', {
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
      expect(res.meta.total).toBe(1);
    });

    it('should allow student to withdraw APPLIED application', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentProfileId: 'stu-1',
        status: ApplicationStatus.APPLIED,
      });

      mockPrismaService.application.update.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.WITHDRAWN,
      });

      const res = await service.withdrawApplication('user-stu-1', 'app-1', {
        note: 'Changed career plans.',
      });

      expect(res.status).toBe(ApplicationStatus.WITHDRAWN);
    });

    it('should reject student withdrawal if status is SELECTED or REJECTED', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        userId: 'user-stu-1',
      });

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentProfileId: 'stu-1',
        status: ApplicationStatus.SELECTED,
      });

      await expect(
        service.withdrawApplication('user-stu-1', 'app-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Recruiter Applicant View & Recruitment Workflow', () => {
    it('should allow recruiter to view applicants for owned jobs', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-rec-1',
      });

      mockPrismaService.job.findMany.mockResolvedValue([{ id: 'job-1' }]);
      mockPrismaService.application.findMany.mockResolvedValue([
        { id: 'app-1', jobId: 'job-1', status: ApplicationStatus.APPLIED },
      ]);
      mockPrismaService.application.count.mockResolvedValue(1);

      const res = await service.getRecruiterApplications('user-rec-1', {
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
    });

    it('should reject recruiter from viewing application for unowned job (BOLA)', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-2',
        userId: 'user-rec-2',
      });

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'app-1',
        job: { recruiterId: 'rec-1' }, // Owned by rec-1!
      });

      await expect(
        service.getRecruiterApplicationDetails('user-rec-2', 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should transition status through valid recruitment workflow and log history', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-rec-1',
      });

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.APPLIED,
        job: { recruiterId: 'rec-1' },
      });

      mockPrismaService.application.update.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.UNDER_REVIEW,
      });

      const updated = await service.updateApplicationStatus(
        'user-rec-1',
        'app-1',
        {
          status: ApplicationStatus.UNDER_REVIEW,
          note: 'Reviewing candidate resume.',
        },
      );

      expect(updated.status).toBe(ApplicationStatus.UNDER_REVIEW);
      expect(mockPrismaService.applicationStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: 'app-1',
            status: ApplicationStatus.UNDER_REVIEW,
            note: 'Reviewing candidate resume.',
            changedByUserId: 'user-rec-1',
          }),
        }),
      );
    });

    it('should reject invalid status jump (e.g. APPLIED -> SELECTED)', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-rec-1',
      });

      mockPrismaService.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.APPLIED,
        job: { recruiterId: 'rec-1' },
      });

      await expect(
        service.updateApplicationStatus('user-rec-1', 'app-1', {
          status: ApplicationStatus.SELECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
