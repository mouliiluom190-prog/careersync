import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType, ExperienceLevel, WorkMode } from '@prisma/client';

export class SearchJobsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsEnum(ExperienceLevel)
  @IsOptional()
  experienceLevel?: ExperienceLevel;

  @IsEnum(WorkMode)
  @IsOptional()
  workMode?: WorkMode;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  skillId?: string;

  @IsString()
  @IsOptional()
  companyId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'title', 'applicationDeadline'])
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
