import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  college?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsInt({ message: 'Graduation year must be a whole number' })
  @Min(2000, { message: 'Graduation year must be 2000 or later' })
  @Max(2100, { message: 'Graduation year cannot exceed 2100' })
  graduationYear?: number;

  @IsOptional()
  @IsNumber({}, { message: 'CGPA must be a valid number' })
  @Min(0.0, { message: 'CGPA cannot be negative' })
  @Max(10.0, { message: 'CGPA cannot exceed 10.0' })
  cgpa?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
