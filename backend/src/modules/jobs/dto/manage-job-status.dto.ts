import { IsEnum } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class ManageJobStatusDto {
  @IsEnum(JobStatus)
  status!: JobStatus;
}
