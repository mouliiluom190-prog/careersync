export class ResumeResponseDto {
  id!: string;
  studentProfileId!: string;
  originalFileName!: string;
  mimeType!: string;
  fileSize!: number;
  isDefault!: boolean;
  isArchived!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  downloadUrl?: string;
}
