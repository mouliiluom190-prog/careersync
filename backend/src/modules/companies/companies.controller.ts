import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER, Role.ADMIN)
  async update(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(userId, role, companyId, dto);
  }
}
