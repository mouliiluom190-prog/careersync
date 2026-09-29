import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SkillsService } from '../skills/skills.service.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { AddSkillDto } from './dto/add-skill.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillsService: SkillsService,
  ) {}

  /**
   * Calculate profile completion percentage based on filled fields
   */
  calculateCompletion(profile: any): number {
    if (!profile) return 0;

    let score = 0;
    if (profile.name && profile.name.trim().length > 0) score += 15;
    if (profile.phone && profile.phone.trim().length > 0) score += 10;
    if (profile.college && profile.college.trim().length > 0) score += 15;
    if (profile.degree && profile.degree.trim().length > 0) score += 10;
    if (profile.department && profile.department.trim().length > 0) score += 10;
    if (profile.graduationYear) score += 10;
    if (profile.cgpa) score += 10;
    if (profile.bio && profile.bio.trim().length > 0) score += 10;
    if (profile.skills && profile.skills.length > 0) score += 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Get student profile for current authenticated user
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        location: true,
      },
    });

    // Create default profile if not present yet
    if (!profile) {
      profile = await this.prisma.studentProfile.create({
        data: {
          userId,
          name: user.email.split('@')[0],
        },
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
          location: true,
        },
      });
    }

    const completion = this.calculateCompletion(profile);

    return {
      ...profile,
      user,
      profileCompletion: completion,
    };
  }

  /**
   * Update student profile for current authenticated user
   */
  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    // Ensure student profile exists
    let profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.studentProfile.create({
        data: {
          userId,
          name: dto.name || 'Student User',
        },
      });
    }

    const updated = await this.prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.college !== undefined && { college: dto.college }),
        ...(dto.degree !== undefined && { degree: dto.degree }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.graduationYear !== undefined && { graduationYear: dto.graduationYear }),
        ...(dto.cgpa !== undefined && { cgpa: dto.cgpa }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        location: true,
      },
    });

    const completion = this.calculateCompletion(updated);

    return {
      ...updated,
      profileCompletion: completion,
    };
  }

  /**
   * Add a skill to student's profile
   */
  async addSkill(userId: string, dto: AddSkillDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    let targetSkill;

    if (dto.skillId) {
      targetSkill = await this.skillsService.findById(dto.skillId);
    } else if (dto.name) {
      targetSkill = await this.skillsService.findOrCreate(dto.name);
    } else {
      throw new BadRequestException('Either skillId or name must be provided');
    }

    // Upsert StudentSkill
    const studentSkill = await this.prisma.studentSkill.upsert({
      where: {
        studentId_skillId: {
          studentId: profile.id,
          skillId: targetSkill.id,
        },
      },
      update: {},
      create: {
        studentId: profile.id,
        skillId: targetSkill.id,
      },
      include: {
        skill: true,
      },
    });

    return studentSkill;
  }

  /**
   * Remove a skill from student's profile
   */
  async removeSkill(userId: string, skillId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    await this.prisma.studentSkill.deleteMany({
      where: {
        studentId: profile.id,
        skillId,
      },
    });

    return { message: 'Skill removed successfully' };
  }

  /**
   * Get student analytics (total applications, status breakdown)
   */
  async getAnalytics(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const applications = await this.prisma.application.findMany({
      where: { studentProfileId: profile.id },
      select: { status: true },
    });

    const totalApplications = applications.length;
    const byStatus: Record<string, number> = {
      APPLIED: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEW_SCHEDULED: 0,
      OFFERED: 0,
      REJECTED: 0,
    };

    applications.forEach((app: { status: string }) => {
      if (byStatus[app.status] !== undefined) {
        byStatus[app.status]++;
      } else {
        byStatus[app.status] = 1;
      }
    });

    return {
      totalApplications,
      byStatus,
    };
  }
}
