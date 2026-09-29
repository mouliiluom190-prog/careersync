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
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { WithdrawApplicationDto } from './dto/withdraw-application.dto.js';
import { ApplicationQueryDto } from './dto/application-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * Student: Apply to job
   */
  @Post('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async applyToJob(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.applyToJob(userId, dto);
  }

  /**
   * Student: Get my application list
   */
  @Get('applications/student/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentApplications(
    @CurrentUser('id') userId: string,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationsService.getStudentApplications(userId, query);
  }

  /**
   * Student: Get my single application details
   */
  @Get('applications/student/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentApplicationDetails(
    @CurrentUser('id') userId: string,
    @Param('id') applicationId: string,
  ) {
    return this.applicationsService.getStudentApplicationDetails(
      userId,
      applicationId,
    );
  }

  /**
   * Student: Withdraw application
   */
  @Patch('applications/:id/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async withdrawApplication(
    @CurrentUser('id') userId: string,
    @Param('id') applicationId: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    return this.applicationsService.withdrawApplication(
      userId,
      applicationId,
      dto,
    );
  }

  /**
   * Recruiter: View applicants for recruiter's owned jobs
   */
  @Get('recruiter/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getRecruiterApplications(
    @CurrentUser('id') userId: string,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationsService.getRecruiterApplications(userId, query);
  }

  /**
   * Recruiter: View specific applicant details
   */
  @Get('recruiter/applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getRecruiterApplicationDetails(
    @CurrentUser('id') userId: string,
    @Param('id') applicationId: string,
  ) {
    return this.applicationsService.getRecruiterApplicationDetails(
      userId,
      applicationId,
    );
  }

  /**
   * Recruiter: Move application through recruitment workflow status
   */
  @Patch('recruiter/applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateApplicationStatus(
    @CurrentUser('id') userId: string,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateApplicationStatus(
      userId,
      applicationId,
      dto,
    );
  }
}
