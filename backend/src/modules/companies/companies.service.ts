import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a company and link it to the requesting recruiter's profile
   */
  async create(recruiterUserId: string, dto: CreateCompanyDto) {
    const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
      where: { userId: recruiterUserId },
    });

    if (!recruiterProfile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        description: dto.description,
        website: dto.website,
        email: dto.email,
        phone: dto.phone,
        logoUrl: dto.logoUrl,
      },
    });

    // Link company to recruiter profile
    await this.prisma.recruiterProfile.update({
      where: { id: recruiterProfile.id },
      data: { companyId: company.id },
    });

    return company;
  }

  /**
   * Find company by ID
   */
  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        recruiters: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
        location: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return company;
  }

  /**
   * Update company with ownership authorization check
   */
  async update(
    userId: string,
    userRole: Role,
    companyId: string,
    dto: UpdateCompanyDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    // Ownership check: Unless ADMIN, recruiter must be associated with this company
    if (userRole !== Role.ADMIN) {
      const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
        where: { userId },
      });

      if (!recruiterProfile || recruiterProfile.companyId !== companyId) {
        throw new ForbiddenException(
          'You are not authorized to modify this company',
        );
      }
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
      include: {
        location: true,
      },
    });
  }
}
