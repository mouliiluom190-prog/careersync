import { IsEnum } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class UpdateJobModerationDto {
  @IsEnum(JobStatus)
  status!: JobStatus;
}
