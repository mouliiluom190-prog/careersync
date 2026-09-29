import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsInt,
  IsArray,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  EmploymentType,
  ExperienceLevel,
  WorkMode,
  JobStatus,
} from '@prisma/client';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsEnum(ExperienceLevel)
  @IsOptional()
  experienceLevel?: ExperienceLevel;

  @IsEnum(WorkMode)
  @IsOptional()
  workMode?: WorkMode;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  openings?: number;

  @IsDateString()
  @IsOptional()
  applicationDeadline?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skillIds?: string[];

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
