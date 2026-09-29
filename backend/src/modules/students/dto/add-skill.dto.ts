import { IsOptional, IsString } from 'class-validator';

export class AddSkillDto {
  @IsOptional()
  @IsString()
  skillId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
