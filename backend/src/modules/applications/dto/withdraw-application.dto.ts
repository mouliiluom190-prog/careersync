import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawApplicationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
