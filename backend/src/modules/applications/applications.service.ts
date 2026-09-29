import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { WithdrawApplicationDto } from './dto/withdraw-application.dto.js';
import { ApplicationQueryDto } from './dto/application-query.dto.js';
import { ApplicationStatus, JobStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch student profile
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
   * Helper to fetch recruiter profile
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
   * Student: Apply to an active job
   */
  async applyToJob(userId: string, dto: CreateApplicationDto) {
    const student = await this.getStudentProfile(userId);

    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.ACTIVE) {
      throw new BadRequestException('This job is not accepting applications');
    }

    if (
      job.applicationDeadline &&
      new Date() > new Date(job.applicationDeadline)
    ) {
      throw new BadRequestException(
        'The application deadline for this job has passed',
      );
    }

    // Check for duplicate application
    const existing = await this.prisma.application.findUnique({
      where: {
        studentProfileId_jobId: {
          studentProfileId: student.id,
          jobId: dto.jobId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already applied to this job');
    }

    // Resolve resumeId & verify ownership
    let targetResumeId: string | null = null;
    let targetResumeUrl: string | null = dto.resumeUrl || null;

    if (dto.resumeId) {
      const resume = await this.prisma.resume?.findUnique({
        where: { id: dto.resumeId },
      });
      if (
        !resume ||
        resume.studentProfileId !== student.id ||
        resume.isArchived
      ) {
        throw new NotFoundException(
          'Selected resume not found or unauthorized',
        );
      }
      targetResumeId = resume.id;
      targetResumeUrl = targetResumeUrl || resume.originalFileName;
    } else {
      const defaultResume = await this.prisma.resume?.findFirst({
        where: {
          studentProfileId: student.id,
          isDefault: true,
          isArchived: false,
        },
      });
      if (defaultResume) {
        targetResumeId = defaultResume.id;
        targetResumeUrl = targetResumeUrl || defaultResume.originalFileName;
      }
    }

    // Atomic creation of Application and initial StatusHistory
    const application = await this.prisma.$transaction(async (tx) => {
      const appRecord = await tx.application.create({
        data: {
          studentProfileId: student.id,
          jobId: dto.jobId,
          resumeId: targetResumeId,
          resumeUrl: targetResumeUrl,
          coverLetter: dto.coverLetter,
          status: ApplicationStatus.APPLIED,
        },
        include: {
          job: {
            include: {
              company: true,
              location: true,
            },
          },
          resume: true,
          history: true,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: appRecord.id,
          status: ApplicationStatus.APPLIED,
          note: 'Application submitted by student',
          changedByUserId: userId,
        },
      });

      return appRecord;
    });

    return application;
  }

  /**
   * Student: Get my applications list
   */
  async getStudentApplications(userId: string, query: ApplicationQueryDto) {
    const student = await this.getStudentProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      studentProfileId: student.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: {
              company: true,
              location: true,
            },
          },
          resume: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.application.count({ where }),
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
   * Student: Get my single application details
   */
  async getStudentApplicationDetails(userId: string, applicationId: string) {
    const student = await this.getStudentProfile(userId);

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            company: true,
            location: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        resume: true,
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application || application.studentProfileId !== student.id) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  /**
   * Student: Withdraw application
   */
  async withdrawApplication(
    userId: string,
    applicationId: string,
    dto: WithdrawApplicationDto,
  ) {
    const student = await this.getStudentProfile(userId);

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.studentProfileId !== student.id) {
      throw new NotFoundException('Application not found');
    }

    // Only APPLIED and UNDER_REVIEW applications can be withdrawn
    if (
      application.status !== ApplicationStatus.APPLIED &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Cannot withdraw application at this status stage',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const appRecord = await tx.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.WITHDRAWN },
        include: {
          job: {
            include: {
              company: true,
            },
          },
          history: true,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          status: ApplicationStatus.WITHDRAWN,
          note: dto.note || 'Application withdrawn by student',
          changedByUserId: userId,
        },
      });

      return appRecord;
    });

    return updated;
  }

  /**
   * Recruiter: Get applicants for recruiter's owned jobs
   */
  async getRecruiterApplications(userId: string, query: ApplicationQueryDto) {
    const recruiter = await this.getRecruiterProfile(userId);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Get all job IDs owned by recruiter
    const ownedJobs = await this.prisma.job.findMany({
      where: { recruiterId: recruiter.id },
      select: { id: true },
    });

    const ownedJobIds = ownedJobs.map((j) => j.id);

    if (ownedJobIds.length === 0) {
      return {
        data: [],
        meta: { page: 1, limit, total: 0, totalPages: 1 },
      };
    }

    const where: any = {
      jobId: { in: ownedJobIds },
    };

    if (query.jobId) {
      if (!ownedJobIds.includes(query.jobId)) {
        throw new ForbiddenException(
          'You are not authorized to access applicants for this job',
        );
      }
      where.jobId = query.jobId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          job: {
            include: {
              company: true,
            },
          },
          resume: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.application.count({ where }),
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
   * Recruiter: Get applicant & application details
   */
  async getRecruiterApplicationDetails(userId: string, applicationId: string) {
    const recruiter = await this.getRecruiterProfile(userId);

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
            skills: {
              include: {
                skill: true,
              },
            },
            location: true,
          },
        },
        job: {
          include: {
            company: true,
            location: true,
          },
        },
        resume: true,
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.job.recruiterId !== recruiter.id) {
      throw new ForbiddenException(
        'You are not authorized to view applicants for this job',
      );
    }

    return application;
  }

  /**
   * Recruiter: Update application status in recruitment workflow
   */
  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const recruiter = await this.getRecruiterProfile(userId);

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.job.recruiterId !== recruiter.id) {
      throw new ForbiddenException(
        'You are not authorized to update application status for this job',
      );
    }

    // Status transition validation rules
    this.validateStatusTransition(application.status, dto.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const appRecord = await tx.application.update({
        where: { id: applicationId },
        data: { status: dto.status },
        include: {
          studentProfile: true,
          job: true,
          history: true,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          status: dto.status,
          note: dto.note || `Status updated to ${dto.status} by recruiter`,
          changedByUserId: userId,
        },
      });

      return appRecord;
    });

    return updated;
  }

  /**
   * Validate status transition state machine
   */
  private validateStatusTransition(
    current: ApplicationStatus,
    target: ApplicationStatus,
  ) {
    if (current === target) return;

    // Terminal states cannot be changed
    if (
      current === ApplicationStatus.SELECTED ||
      current === ApplicationStatus.REJECTED ||
      current === ApplicationStatus.WITHDRAWN
    ) {
      throw new BadRequestException(
        `Cannot change status from terminal state '${current}'`,
      );
    }

    const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      [ApplicationStatus.APPLIED]: [
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.UNDER_REVIEW]: [
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ],
      [ApplicationStatus.SHORTLISTED]: [
        ApplicationStatus.INTERVIEW,
        ApplicationStatus.REJECTED,
      ],
      [ApplicationStatus.INTERVIEW]: [
        ApplicationStatus.SELECTED,
        ApplicationStatus.REJECTED,
      ],
      [ApplicationStatus.SELECTED]: [],
      [ApplicationStatus.REJECTED]: [],
      [ApplicationStatus.WITHDRAWN]: [],
    };

    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Invalid status transition from '${current}' to '${target}'`,
      );
    }
  }
}
