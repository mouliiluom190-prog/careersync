import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Role, JobStatus, ApplicationStatus } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateCompanyVerificationDto } from './dto/update-company-verification.dto.js';
import { UpdateJobModerationDto } from './dto/update-job-moderation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('users')
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, role, search);
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @CurrentUser('id') currentAdminId: string,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(
      currentAdminId,
      targetUserId,
      dto.isActive,
    );
  }

  @Get('companies')
  async getCompanies(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getCompanies(page, limit, search);
  }

  @Patch('companies/:id/verify')
  async updateCompanyVerification(
    @Param('id') companyId: string,
    @Body() dto: UpdateCompanyVerificationDto,
  ) {
    return this.adminService.updateCompanyVerification(
      companyId,
      dto.isVerified,
    );
  }

  @Get('jobs')
  async getJobs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: JobStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getJobs(page, limit, status, search);
  }

  @Patch('jobs/:id/status')
  async updateJobStatus(
    @Param('id') jobId: string,
    @Body() dto: UpdateJobModerationDto,
  ) {
    return this.adminService.updateJobStatus(jobId, dto.status);
  }

  @Get('applications')
  async getApplications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.adminService.getApplications(page, limit, status);
  }
}
