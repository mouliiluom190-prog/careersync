import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsString()
  @IsOptional()
  resumeId?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3000)
  coverLetter?: string;
}
