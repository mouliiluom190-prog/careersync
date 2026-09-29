import { Module } from '@nestjs/common';
import { RecruitersController } from './recruiters.controller.js';
import { RecruitersService } from './recruiters.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}
