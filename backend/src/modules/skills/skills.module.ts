import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller.js';
import { SkillsService } from './skills.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
