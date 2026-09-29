import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Role, JobStatus, ApplicationStatus, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get overall platform statistics and analytics
   */
  async getAnalytics() {
    const [
      totalUsers,
      totalStudents,
      totalRecruiters,
      totalAdmins,
      totalCompanies,
      verifiedCompanies,
      totalJobs,
      activeJobs,
      closedJobs,
      totalApplications,
      applicationsByStatusRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.RECRUITER } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.company.count(),
      this.prisma.company.count({ where: { isVerified: true } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.ACTIVE } }),
      this.prisma.job.count({ where: { status: JobStatus.CLOSED } }),
      this.prisma.application.count(),
      this.prisma.application.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const applicationsByStatus: Record<string, number> = {
      APPLIED: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEW_SCHEDULED: 0,
      OFFERED: 0,
      REJECTED: 0,
    };

    applicationsByStatusRaw.forEach((group: { status: string; _count: { status: number } }) => {
      applicationsByStatus[group.status] = group._count.status;
    });

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        recruiters: totalRecruiters,
        admins: totalAdmins,
      },
      companies: {
        total: totalCompanies,
        verified: verifiedCompanies,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
      },
      applications: {
        total: totalApplications,
        byStatus: applicationsByStatus,
      },
    };
  }

  /**
   * Get paginated user list (omitting sensitive hashes)
   */
  async getUsers(page = 1, limit = 10, role?: Role, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { studentProfile: { name: { contains: q, mode: 'insensitive' } } },
        { recruiterProfile: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: {
            select: {
              id: true,
              name: true,
              college: true,
              degree: true,
            },
          },
          recruiterProfile: {
            select: {
              id: true,
              name: true,
              designation: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Activate or deactivate user account
   */
  async updateUserStatus(currentAdminId: string, targetUserId: string, isActive: boolean) {
    if (currentAdminId === targetUserId && !isActive) {
      throw new BadRequestException('Admins cannot deactivate their own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Get paginated companies
   */
  async getCompanies(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.CompanyWhereInput = {};

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { website: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          recruiters: {
            select: {
              id: true,
              name: true,
              designation: true,
            },
          },
          _count: {
            select: { jobs: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Verify or unverify company
   */
  async updateCompanyVerification(companyId: string, isVerified: boolean) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: { isVerified },
      include: {
        location: true,
      },
    });
  }

  /**
   * Get paginated jobs for admin moderation
   */
  async getJobs(page = 1, limit = 10, status?: JobStatus, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.JobWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          recruiter: {
            select: {
              id: true,
              name: true,
              user: {
                select: { email: true },
              },
            },
          },
          location: true,
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Moderate job status (e.g. close problematic job)
   */
  async updateJobStatus(jobId: string, status: JobStatus) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status },
      include: {
        company: true,
        recruiter: true,
      },
    });

    await this.redisService.invalidatePattern('jobs:search:*');

    return updated;
  }

  /**
   * Get platform-wide application overview (read-only)
   */
  async getApplications(page = 1, limit = 10, status?: ApplicationStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.ApplicationWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: { name: true },
              },
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              user: {
                select: { email: true },
              },
            },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
