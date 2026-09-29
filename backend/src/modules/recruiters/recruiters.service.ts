import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';

@Injectable()
export class RecruitersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate recruiter profile completion percentage
   */
  calculateCompletion(profile: any): number {
    if (!profile) return 0;

    let score = 0;
    if (profile.name && profile.name.trim().length > 0) score += 25;
    if (profile.phone && profile.phone.trim().length > 0) score += 15;
    if (profile.designation && profile.designation.trim().length > 0) score += 25;
    if (profile.bio && profile.bio.trim().length > 0) score += 15;
    if (profile.companyId) score += 20;

    return Math.min(100, Math.round(score));
  }

  /**
   * Get recruiter profile for current authenticated user
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

    let profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: {
        company: {
          include: {
            location: true,
          },
        },
      },
    });

    // Create default profile if not present yet
    if (!profile) {
      profile = await this.prisma.recruiterProfile.create({
        data: {
          userId,
          name: user.email.split('@')[0],
        },
        include: {
          company: {
            include: {
              location: true,
            },
          },
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
   * Update recruiter profile for current authenticated user
   */
  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    let profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.recruiterProfile.create({
        data: {
          userId,
          name: dto.name || 'Recruiter User',
        },
      });
    }

    const updated = await this.prisma.recruiterProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.designation !== undefined && { designation: dto.designation }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
      },
      include: {
        company: {
          include: {
            location: true,
          },
        },
      },
    });

    const completion = this.calculateCompletion(updated);

    return {
      ...updated,
      profileCompletion: completion,
    };
  }
}
