import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'Skill name is required' })
  @MinLength(1, { message: 'Skill name cannot be empty' })
  @MaxLength(50, { message: 'Skill name cannot exceed 50 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;
}
