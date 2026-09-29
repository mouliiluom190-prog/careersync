import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { AddSkillDto } from './dto/add-skill.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me/profile')
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.studentsService.getProfile(userId);
  }

  @Post('me/profile')
  async createOrUpdateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentsService.updateProfile(userId, dto);
  }

  @Patch('me/profile')
  async patchProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentsService.updateProfile(userId, dto);
  }

  @Get('me/skills')
  async getMySkills(@CurrentUser('id') userId: string) {
    const profile = await this.studentsService.getProfile(userId);
    return profile.skills || [];
  }

  @Post('me/skills')
  async addSkill(
    @CurrentUser('id') userId: string,
    @Body() dto: AddSkillDto,
  ) {
    return this.studentsService.addSkill(userId, dto);
  }

  @Delete('me/skills/:skillId')
  async removeSkill(
    @CurrentUser('id') userId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.studentsService.removeSkill(userId, skillId);
  }
}
