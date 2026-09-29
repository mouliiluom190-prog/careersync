import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { SearchJobsDto } from './dto/search-jobs.dto.js';
import { ManageJobStatusDto } from './dto/manage-job-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Recruiter: Create Job
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async createJob(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.createJob(userId, dto);
  }

  /**
   * Recruiter: View own posted jobs (Paginated)
   */
  @Get('recruiter/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getMyRecruiterJobs(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.jobsService.getRecruiterJobs(userId, p, l);
  }

  /**
   * Recruiter: View specific owned job
   */
  @Get('recruiter/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getMyRecruiterJob(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string,
  ) {
    return this.jobsService.getRecruiterJob(userId, jobId);
  }

  /**
   * Recruiter: Update owned job
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateJob(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(userId, jobId, dto);
  }

  /**
   * Recruiter: Update job status (ACTIVE / CLOSED / DRAFT / EXPIRED)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateJobStatus(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string,
    @Body() dto: ManageJobStatusDto,
  ) {
    return this.jobsService.updateJobStatus(userId, jobId, dto.status);
  }

  /**
   * Student / Public: Browse active jobs (Search, Filter, Pagination)
   */
  @Get()
  async findAllPublicJobs(@Query() query: SearchJobsDto) {
    return this.jobsService.findAllPublicJobs(query);
  }

  /**
   * Student / Public: Get single active job details
   */
  @Get(':id')
  async findOnePublicJob(@Param('id') jobId: string) {
    return this.jobsService.findOnePublicJob(jobId);
  }
}
