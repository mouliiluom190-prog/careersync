import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { RecruitersService } from './recruiters.service.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('recruiters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RECRUITER)
export class RecruitersController {
  constructor(private readonly recruitersService: RecruitersService) {}

  @Get('me/profile')
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.recruitersService.getProfile(userId);
  }

  @Post('me/profile')
  async createOrUpdateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.recruitersService.updateProfile(userId, dto);
  }

  @Patch('me/profile')
  async patchProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.recruitersService.updateProfile(userId, dto);
  }

  @Get('me/analytics')
  async getAnalytics(@CurrentUser('id') userId: string) {
    return this.recruitersService.getAnalytics(userId);
  }
}
