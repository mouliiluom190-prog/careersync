import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { SearchJobsDto } from './dto/search-jobs.dto.js';
import { JobStatus, Prisma } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch authenticated recruiter profile
   */
  private async getRecruiterProfile(userId: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!recruiter) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return recruiter;
  }

  /**
   * Create a new Job (Recruiter only)
   */
  async createJob(userId: string, dto: CreateJobDto) {
    const recruiter = await this.getRecruiterProfile(userId);

    if (!recruiter.companyId) {
      throw new BadRequestException(
        'Recruiter must be associated with a company before posting jobs',
      );
    }

    // Salary range validation
    if (
      dto.salaryMin !== undefined &&
      dto.salaryMax !== undefined &&
      dto.salaryMax < dto.salaryMin
    ) {
      throw new BadRequestException(
        'salaryMax cannot be less than salaryMin',
      );
    }

    // Verify skills exist if provided
    if (dto.skillIds && dto.skillIds.length > 0) {
      const uniqueSkillIds = Array.from(new Set(dto.skillIds));
      const count = await this.prisma.skill.count({
        where: { id: { in: uniqueSkillIds } },
      });
      if (count !== uniqueSkillIds.length) {
        throw new BadRequestException('One or more skill IDs are invalid');
      }
    }

    // Verify location if provided
    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
    }

    const uniqueSkillIds = dto.skillIds
      ? Array.from(new Set(dto.skillIds))
      : [];

    const job = await this.prisma.job.create({
      data: {
        recruiterId: recruiter.id,
        companyId: recruiter.companyId,
        title: dto.title,
        description: dto.description,
        employmentType: dto.employmentType ?? 'FULL_TIME',
        experienceLevel: dto.experienceLevel ?? 'ENTRY',
        workMode: dto.workMode ?? 'ONSITE',
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency ?? 'INR',
        locationId: dto.locationId,
        openings: dto.openings ?? 1,
        applicationDeadline: dto.applicationDeadline
          ? new Date(dto.applicationDeadline)
          : null,
        status: dto.status ?? 'ACTIVE',
        skills: {
          create: uniqueSkillIds.map((skillId) => ({ skillId })),
        },
      },
      include: {
        company: true,
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return job;
  }

  /**
   * Get all jobs owned by the authenticated recruiter
   */
  async getRecruiterJobs(userId: string, page = 1, limit = 10) {
    const recruiter = await this.getRecruiterProfile(userId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { recruiterId: recruiter.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          location: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      }),
      this.prisma.job.count({
        where: { recruiterId: recruiter.id },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get a single job owned by the recruiter (with ownership check)
   */
  async getRecruiterJob(userId: string, jobId: string) {
    const recruiter = await this.getRecruiterProfile(userId);

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.recruiterId !== recruiter.id) {
      throw new ForbiddenException('You are not authorized to access this job');
    }

    return job;
  }

  /**
   * Update a job (Recruiter ownership required)
   */
  async updateJob(userId: string, jobId: string, dto: UpdateJobDto) {
    const recruiter = await this.getRecruiterProfile(userId);

    const existingJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found');
    }

    if (existingJob.recruiterId !== recruiter.id) {
      throw new ForbiddenException('You are not authorized to update this job');
    }

    // Salary range validation
    const minSalary =
      dto.salaryMin !== undefined ? dto.salaryMin : existingJob.salaryMin;
    const maxSalary =
      dto.salaryMax !== undefined ? dto.salaryMax : existingJob.salaryMax;

    if (
      minSalary !== null &&
      maxSalary !== null &&
      minSalary !== undefined &&
      maxSalary !== undefined &&
      maxSalary < minSalary
    ) {
      throw new BadRequestException('salaryMax cannot be less than salaryMin');
    }

    // Verify skills if updated
    let uniqueSkillIds: string[] | undefined;
    if (dto.skillIds) {
      uniqueSkillIds = Array.from(new Set(dto.skillIds));
      if (uniqueSkillIds.length > 0) {
        const count = await this.prisma.skill.count({
          where: { id: { in: uniqueSkillIds } },
        });
        if (count !== uniqueSkillIds.length) {
          throw new BadRequestException('One or more skill IDs are invalid');
        }
      }
    }

    // Verify location if updated
    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
    }

    // Perform transaction to update job and skill relations
    const updatedJob = await this.prisma.$transaction(async (tx) => {
      if (uniqueSkillIds !== undefined) {
        // Remove existing skills
        await tx.jobSkill.deleteMany({
          where: { jobId },
        });

        // Insert new skills
        if (uniqueSkillIds.length > 0) {
          await tx.jobSkill.createMany({
            data: uniqueSkillIds.map((skillId) => ({ jobId, skillId })),
          });
        }
      }

      return tx.job.update({
        where: { id: jobId },
        data: {
          title: dto.title,
          description: dto.description,
          employmentType: dto.employmentType,
          experienceLevel: dto.experienceLevel,
          workMode: dto.workMode,
          salaryMin: dto.salaryMin,
          salaryMax: dto.salaryMax,
          salaryCurrency: dto.salaryCurrency,
          locationId: dto.locationId,
          openings: dto.openings,
          applicationDeadline: dto.applicationDeadline
            ? new Date(dto.applicationDeadline)
            : dto.applicationDeadline === null
              ? null
              : undefined,
          status: dto.status,
        },
        include: {
          company: true,
          location: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });
    });

    return updatedJob;
  }

  /**
   * Update job status (DRAFT / ACTIVE / CLOSED / EXPIRED)
   */
  async updateJobStatus(userId: string, jobId: string, status: JobStatus) {
    const recruiter = await this.getRecruiterProfile(userId);

    const existingJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found');
    }

    if (existingJob.recruiterId !== recruiter.id) {
      throw new ForbiddenException(
        'You are not authorized to modify status for this job',
      );
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: { status },
      include: {
        company: true,
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
  }

  /**
   * Browse & search active public jobs (Students / All Users)
   */
  async findAllPublicJobs(dto: SearchJobsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      status: JobStatus.ACTIVE,
    };

    if (dto.employmentType) {
      where.employmentType = dto.employmentType;
    }

    if (dto.experienceLevel) {
      where.experienceLevel = dto.experienceLevel;
    }

    if (dto.workMode) {
      where.workMode = dto.workMode;
    }

    if (dto.locationId) {
      where.locationId = dto.locationId;
    }

    if (dto.companyId) {
      where.companyId = dto.companyId;
    }

    if (dto.skillId) {
      where.skills = {
        some: { skillId: dto.skillId },
      };
    }

    if (dto.search && dto.search.trim() !== '') {
      const q = dto.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        {
          skills: {
            some: {
              skill: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const sortField = dto.sortBy || 'createdAt';
    const sortOrder = dto.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortOrder },
        include: {
          company: true,
          location: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single public job details
   */
  async findOnePublicJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        location: true,
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!job || job.status !== JobStatus.ACTIVE) {
      throw new NotFoundException('Job not found or no longer active');
    }

    return job;
  }
}
