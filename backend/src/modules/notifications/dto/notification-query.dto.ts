import { IsOptional, IsBooleanString, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class NotificationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isRead?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
