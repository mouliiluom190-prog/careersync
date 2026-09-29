import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobsService } from '../src/modules/jobs/jobs.service.js';
import { JobStatus, EmploymentType, ExperienceLevel, WorkMode } from '@prisma/client';

describe('JobsService (Unit & Security Suite)', () => {
  let service: JobsService;
  let mockPrismaService: any;
  let mockRedisService: any;

  beforeEach(() => {
    mockRedisService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
      invalidatePattern: vi.fn().mockResolvedValue(true),
    };

    mockPrismaService = {
      recruiterProfile: {
        findUnique: vi.fn(),
      },
      job: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      skill: {
        count: vi.fn(),
      },
      location: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrismaService)),
      jobSkill: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };

    service = new JobsService(mockPrismaService as any, mockRedisService as any);
  });

  describe('createJob', () => {
    it('should create a job for a recruiter with an associated company', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        companyId: 'comp-1',
      });

      mockPrismaService.skill.count.mockResolvedValue(1);
      mockPrismaService.job.create.mockResolvedValue({
        id: 'job-1',
        title: 'Software Engineer',
        recruiterId: 'rec-1',
        companyId: 'comp-1',
        status: JobStatus.ACTIVE,
        skills: [{ skill: { id: 'sk-1', name: 'TypeScript' } }],
      });

      const result = await service.createJob('user-1', {
        title: 'Software Engineer',
        description: 'Great software engineer role building web apps.',
        skillIds: ['sk-1'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('job-1');
      expect(mockPrismaService.job.create).toHaveBeenCalled();
    });

    it('should reject creation if recruiter has no associated company', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        companyId: null,
      });

      await expect(
        service.createJob('user-1', {
          title: 'Unlinked Job',
          description: 'No company linked to recruiter.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid salary range (salaryMax < salaryMin)', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        companyId: 'comp-1',
      });

      await expect(
        service.createJob('user-1', {
          title: 'Invalid Salary Job',
          description: 'Salary max is lower than salary min.',
          salaryMin: 100000,
          salaryMax: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid skill IDs', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        companyId: 'comp-1',
      });

      mockPrismaService.skill.count.mockResolvedValue(0); // Skill not found

      await expect(
        service.createJob('user-1', {
          title: 'Bad Skill Job',
          description: 'Skill does not exist in db.',
          skillIds: ['invalid-skill-id'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Job Ownership & Updates', () => {
    it('should allow recruiter to update own job', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        companyId: 'comp-1',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'rec-1',
        title: 'Original Title',
        salaryMin: 50000,
        salaryMax: 100000,
      });

      mockPrismaService.job.update.mockResolvedValue({
        id: 'job-1',
        title: 'Updated Title',
      });

      const updated = await service.updateJob('user-1', 'job-1', {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
    });

    it('should reject update if recruiter does not own the job (BOLA protection)', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-2', // Different recruiter
        userId: 'user-2',
        companyId: 'comp-2',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'rec-1', // Belongs to rec-1
        title: 'Original Title',
      });

      await expect(
        service.updateJob('user-2', 'job-1', {
          title: 'Hacked Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject status update if recruiter does not own the job', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({
        id: 'rec-2',
        userId: 'user-2',
      });

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'rec-1',
      });

      await expect(
        service.updateJobStatus('user-2', 'job-1', JobStatus.CLOSED),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Public Job Discovery, Search & Filters', () => {
    it('should query active jobs only with pagination and filters', async () => {
      const activeJobs = [
        {
          id: 'job-1',
          title: 'Backend Developer',
          status: JobStatus.ACTIVE,
          employmentType: EmploymentType.FULL_TIME,
          experienceLevel: ExperienceLevel.MID,
          workMode: WorkMode.REMOTE,
        },
      ];

      mockPrismaService.job.findMany.mockResolvedValue(activeJobs);
      mockPrismaService.job.count.mockResolvedValue(1);

      const res = await service.findAllPublicJobs({
        search: 'Backend',
        employmentType: EmploymentType.FULL_TIME,
        page: 1,
        limit: 10,
      });

      expect(res.data.length).toBe(1);
      expect(res.meta.total).toBe(1);
      expect(res.meta.totalPages).toBe(1);
      expect(mockPrismaService.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: JobStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should throw NotFoundException if public job is missing or inactive', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'job-closed',
        status: JobStatus.CLOSED,
      });

      await expect(service.findOnePublicJob('job-closed')).rejects.toThrow(NotFoundException);
    });
  });
});
