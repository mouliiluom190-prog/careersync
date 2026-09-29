import { IsBoolean } from 'class-validator';

export class UpdateCompanyVerificationDto {
  @IsBoolean()
  isVerified!: boolean;
}
